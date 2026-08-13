import { describe, it, expect } from 'vitest'
import { PostgresDriver } from '../postgres/driver'
import { NeonConnection } from '../postgres/connection'
import { POSTGRES_CAPABILITIES } from '../capabilities'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { runDatabaseContractSuite } from './contract-suite'

const httpConnectionString = process.env.NEON_CONNECTION_STRING
const wsConnectionString = process.env.NEON_WS_CONNECTION_STRING

describe.skipIf(!httpConnectionString)('neon (http mode)', () => {
  const cs = httpConnectionString!

  runDatabaseContractSuite(
    'neon-http',
    () => new PostgresDriver({ provider: 'postgres', connectionString: cs, driver: 'neon', mode: 'http' }),
    POSTGRES_CAPABILITIES,
    {
      supportsTransactions: false,
      cleanup: async driver => {
        await driver.exec('DROP VIEW IF EXISTS v_widgets')
        await driver.exec('DROP TABLE IF EXISTS widgets')
        await driver.exec('DROP TABLE IF EXISTS items')
      },
    },
  )

  it('rejects transactions with actionable error (no HTTP transaction composition)', async () => {
    const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs, driver: 'neon', mode: 'http' })
    await driver.connect()
    try {
      await expect(driver.transaction(async () => 1)).rejects.toThrow(/websocket/)
    } finally {
      await driver.close()
    }
  })

  it('reports DATABASE_UNAVAILABLE on bad connection', async () => {
    const conn = new NeonConnection('postgres://user:pass@localhost:1/nope', 'http')
    const ok = await conn.ping()
    expect(ok).toBe(false)
  })
})

describe.skipIf(!wsConnectionString)('neon (websocket mode)', () => {
  const cs = wsConnectionString!

  runDatabaseContractSuite(
    'neon-ws',
    () => new PostgresDriver({ provider: 'postgres', connectionString: cs, driver: 'neon', mode: 'websocket' }),
    POSTGRES_CAPABILITIES,
    {
      cleanup: async driver => {
        await driver.exec('DROP VIEW IF EXISTS v_widgets')
        await driver.exec('DROP TABLE IF EXISTS widgets')
        await driver.exec('DROP TABLE IF EXISTS items')
      },
    },
  )

  it('supports transactions with session semantics', async () => {
    const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs, driver: 'neon', mode: 'websocket' })
    await driver.connect()
    try {
      await driver.exec('DROP TABLE IF EXISTS ntx')
      await driver.exec('CREATE TABLE ntx (id INTEGER PRIMARY KEY, name TEXT)')
      await driver.transaction(async () => {
        await driver.execute('INSERT INTO ntx (id, name) VALUES (?, ?)', [1, 'a'])
        await driver.execute('INSERT INTO ntx (id, name) VALUES (?, ?)', [2, 'b'])
      })
      expect((await driver.query('SELECT COUNT(*) as c FROM ntx'))[0].c).toBe(2)

      await expect(driver.transaction(async () => {
        await driver.execute('INSERT INTO ntx (id, name) VALUES (?, ?)', [3, 'c'])
        throw new Error('boom')
      })).rejects.toThrow('boom')
      expect((await driver.query('SELECT COUNT(*) as c FROM ntx'))[0].c).toBe(2)
      await driver.exec('DROP TABLE ntx')
    } finally {
      await driver.close()
    }
  })

  it('maps errors to DatabaseError via websocket client', async () => {
    const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs, driver: 'neon', mode: 'websocket' })
    await driver.connect()
    try {
      const err = await driver.query('SELECT * FROM missing_table').catch(e => e)
      expect(err).toBeInstanceOf(DatabaseError)
      expect((err as DatabaseError).code).toBe(DatabaseErrorCode.DATABASE_SCHEMA_ERROR)
    } finally {
      await driver.close()
    }
  })
})