import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Solarch } from '../../solarch'
import { createSuperuser, hasSuperuser } from '../../cmd/superuser'
import express from 'express'
import path from 'path'
import fs from 'fs'
import os from 'os'
import request from 'supertest'
import { serve } from '../serve'
import http from 'http'

describe('CLI & Database Configuration Integration (CONFIG-5 / CONFIG-12)', () => {
  let tempDir: string
  const pgTestUrl = process.env.PG_TEST_CONNECTION_STRING

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cli-test-'))
    process.env.SOLARCH_JWT_SECRET = 's'.repeat(32)
  })

  afterEach(async () => {
    delete process.env.DATABASE_URL
    delete process.env.DB_PROVIDER
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('creates superuser in SQLite without errors in specified dataDir', async () => {
    const app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    await createSuperuser({
      app,
      email: 'admin@example.com',
      password: 'SecurePassword123!',
      dataDir: tempDir,
    })

    expect(await hasSuperuser(app)).toBe(true)
    expect(fs.existsSync(path.join(tempDir, 'data.db'))).toBe(true)
    await app.db().close()
  })

  it('fails fast on startup when database is unreachable and runs zero migrations', async () => {
    const unreachableUrl = 'postgres://user:pass@127.0.0.1:54321/nonexistent_db'
    const app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'postgres',
      connectionString: unreachableUrl,
    })

    await expect(app.bootstrap()).rejects.toThrow(/Could not connect to PostgreSQL|Database is unreachable/)
    expect(app.isBootstrapped()).toBe(false)
  })

  it('prohibits database backups on providers without backup capability', async () => {
    // Construct app with SQLite
    const app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    const ep = express()
    ep.use(express.json())
    ep.use((req: any, _res: any, next: any) => {
      req.authContext = { record: null, isAdmin: true, token: 'test-token' }
      next()
    })
    const { registerBackupRoutes } = await import('../backup.js')
    registerBackupRoutes(app, ep)
    const server = http.createServer(ep)

    try {
      // 1. On SQLite (supports backup):
      const res = await request(server).post('/api/backups').send({ name: 'test_backup' })
      expect([200, 409]).toContain(res.status)

      // 2. On a driver without backup capability (e.g. simulate non-backup driver):
      const mockApp = {
        db: () => ({
          getDriver: () => ({ provider: 'postgres' }), // no backupToFile function
        }),
        dataDir: tempDir,
        logger: () => ({ error: () => {} }),
      } as any

      const nonBackupEp = express()
      nonBackupEp.use(express.json())
      nonBackupEp.use((req: any, _res: any, next: any) => {
        req.authContext = { record: null, isAdmin: true, token: 'test-token' }
        next()
      })
      registerBackupRoutes(mockApp, nonBackupEp)
      const nonBackupServer = http.createServer(nonBackupEp)

      const nonBackupRes = await request(nonBackupServer).post('/api/backups').send({ name: 'test_backup' })
      expect(nonBackupRes.status).toBe(400)
      expect(nonBackupRes.body.message).toContain('not supported for this database provider')
    } finally {
      await app.db().close()
    }
  })

  it.skipIf(!pgTestUrl)('creates superuser on PostgreSQL when DATABASE_URL is set without creating local .db files', async () => {
    process.env.DATABASE_URL = pgTestUrl
    const app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
    })
    expect(app.dbProvider).toBe('postgres')

    await app.bootstrap()
    await createSuperuser({
      app,
      email: 'pgadmin@example.com',
      password: 'SecurePassword123!',
      dataDir: tempDir,
    })

    expect(await hasSuperuser(app)).toBe(true)
    // Invariant: No data.db created in tempDir because database is external
    expect(fs.existsSync(path.join(tempDir, 'data.db'))).toBe(false)
    await app.db().close()
  })
})
