import { describe, it, expect } from 'vitest'
import { resolveAppConfig } from '../config_loader'
import { maskConnectionString, formatDatabaseDestination } from '../../utils/secret_mask'
import path from 'path'
import fs from 'fs'
import os from 'os'

describe('Configuration Resolution & Precedence (CONFIG-2 / CONFIG-9)', () => {
  it('resolves zero-config defaults to sqlite in ./pb_data', () => {
    const config = resolveAppConfig({}, {})
    expect(config.db.provider).toBe('sqlite')
    expect(config.db.connectionString).toBeUndefined()
    expect(config.dataDir).toBe('./pb_data')
    expect(config.queryTimeout).toBe(30)
    expect(config.isDev).toBe(false)
  })

  it('honors explicit sqlite provider when DATABASE_URL is set in environment', () => {
    const config = resolveAppConfig(
      { dbProvider: 'sqlite' },
      { DATABASE_URL: 'postgres://user:pass@localhost:5432/db' },
    )
    expect(config.db.provider).toBe('sqlite')
    expect(config.db.connectionString).toBeUndefined()
  })

  it('infers postgres provider when DATABASE_URL is set without explicit provider', () => {
    const config = resolveAppConfig(
      {},
      { DATABASE_URL: 'postgres://user:pass@localhost:5432/db' },
    )
    expect(config.db.provider).toBe('postgres')
    expect(config.db.connectionString).toBe('postgres://user:pass@localhost:5432/db')
    expect(config.db.driver).toBe('postgres')
    expect(config.db.mode).toBe('tcp')
  })

  it('prioritizes programmatic connectionString over environment DATABASE_URL', () => {
    const config = resolveAppConfig(
      { connectionString: 'postgres://cli:pass@localhost:5432/cliapp' },
      { DATABASE_URL: 'postgres://env:pass@localhost:5432/envapp' },
    )
    expect(config.db.provider).toBe('postgres')
    expect(config.db.connectionString).toBe('postgres://cli:pass@localhost:5432/cliapp')
  })

  it('fails fast when postgres is requested without connectionString', () => {
    expect(() => resolveAppConfig({ dbProvider: 'postgres' }, {})).toThrow(
      /PostgreSQL requires a non-empty connectionString/,
    )
  })

  it('fails fast when DB_PROVIDER is postgres and DATABASE_URL is empty', () => {
    expect(() => resolveAppConfig({}, { DB_PROVIDER: 'postgres', DATABASE_URL: '' })).toThrow(
      /PostgreSQL requires a non-empty connectionString/,
    )
  })

  it('fails fast on unsupported database provider', () => {
    expect(() => resolveAppConfig({ dbProvider: 'redis' as any }, {})).toThrow(
      /Unsupported database provider "redis"/,
    )
  })

  it('fails fast on unsupported driver for postgres', () => {
    expect(() =>
      resolveAppConfig(
        { dbProvider: 'postgres', connectionString: 'postgres://localhost/db', dbDriver: 'mysql' as any },
        {},
      ),
    ).toThrow(/Unsupported database driver "mysql"/)
  })

  it('fails fast when driver postgres is combined with non-tcp mode', () => {
    expect(() =>
      resolveAppConfig(
        { dbProvider: 'postgres', connectionString: 'postgres://localhost/db', dbDriver: 'postgres', dbMode: 'http' as any },
        {},
      ),
    ).toThrow(/driver "postgres" uses mode "tcp"/)
  })

  it('resolves neon driver with default http mode and websocket override', () => {
    const httpNeon = resolveAppConfig(
      { dbProvider: 'postgres', connectionString: 'postgres://localhost/db', dbDriver: 'neon' },
      {},
    )
    expect(httpNeon.db.driver).toBe('neon')
    expect(httpNeon.db.mode).toBe('http')

    const wsNeon = resolveAppConfig(
      { dbProvider: 'postgres', connectionString: 'postgres://localhost/db', dbDriver: 'neon', dbMode: 'websocket' },
      {},
    )
    expect(wsNeon.db.driver).toBe('neon')
    expect(wsNeon.db.mode).toBe('websocket')
  })

  it('fails fast when neon driver is combined with tcp mode', () => {
    expect(() =>
      resolveAppConfig(
        { dbProvider: 'postgres', connectionString: 'postgres://localhost/db', dbDriver: 'neon', dbMode: 'tcp' as any },
        {},
      ),
    ).toThrow(/driver "neon" requires mode "http" or "websocket"/)
  })

  it('resolves individual fields with CLI > ENV > Default precedence', () => {
    const config = resolveAppConfig(
      { dataDir: '/custom/data', queryTimeout: 45 },
      { DATA_DIR: '/env/data', QUERY_TIMEOUT: '60', DEV: 'true' },
    )
    expect(config.dataDir).toBe('/custom/data')
    expect(config.queryTimeout).toBe(45)
    expect(config.isDev).toBe(true)
  })

  it('loads and applies solarch.config.json file config when enabled', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-config-test-'))
    const jsonFile = path.join(tempDir, 'solarch.config.json')
    fs.writeFileSync(
      jsonFile,
      JSON.stringify({
        dataDir: './json_data',
        queryTimeout: 55,
        database: {
          type: 'postgres',
          url: 'postgres://jsonuser:jsonpass@localhost/jsondb',
        },
      }),
    )

    try {
      const config = resolveAppConfig({}, {}, { loadConfigFile: true, cwd: tempDir })
      expect(config.dataDir).toBe('./json_data')
      expect(config.queryTimeout).toBe(55)
      expect(config.db.provider).toBe('postgres')
      expect(config.db.connectionString).toBe('postgres://jsonuser:jsonpass@localhost/jsondb')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe('Secret Masking & Diagnostics (CONFIG-3)', () => {
  it('masks user credentials in standard postgres connection string', () => {
    const masked = maskConnectionString('postgres://admin:super_secret_pw@db.example.com:5432/prod_db')
    expect(masked).toBe('postgres://admin:***@db.example.com:5432/prod_db')
    expect(masked).not.toContain('super_secret_pw')
  })

  it('masks sensitive query parameters in connection strings', () => {
    const masked = maskConnectionString('postgres://user:pass@host:5432/db?sslmode=require&token=my_secret_token')
    expect(masked).toBe('postgres://user:***@host:5432/db?sslmode=require&token=***')
    expect(masked).not.toContain('pass')
    expect(masked).not.toContain('my_secret_token')
  })

  it('handles empty or malformed input without throwing', () => {
    expect(maskConnectionString('')).toBe('')
    expect(maskConnectionString(undefined)).toBe('')
    expect(maskConnectionString('not-a-valid-url')).toBe('not-a-valid-url')
  })

  it('formats database destination summary safely', () => {
    const sqliteSummary = formatDatabaseDestination({ provider: 'sqlite', queryTimeout: 30 }, './pb_data')
    expect(sqliteSummary).toBe('sqlite (dataDir: ./pb_data)')

    const pgSummary = formatDatabaseDestination(
      {
        provider: 'postgres',
        connectionString: 'postgres://app:mysecret@neon.tech:5432/neondb',
        driver: 'neon',
        mode: 'websocket',
        queryTimeout: 30,
      },
      './pb_data',
    )
    expect(pgSummary).toBe('postgres [neon:websocket] (target: postgres://app:***@neon.tech:5432/neondb)')
    expect(pgSummary).not.toContain('mysecret')
  })

  it('ensures thrown validation errors never leak raw connection strings or secrets', () => {
    const secret = 'ultra_secret_pw_12345'
    try {
      resolveAppConfig({
        dbProvider: 'postgres',
        connectionString: `postgres://user:${secret}@localhost:5432/db`,
        dbDriver: 'invalid_driver' as any,
      })
    } catch (err: any) {
      expect(err.message).not.toContain(secret)
    }
  })
})
