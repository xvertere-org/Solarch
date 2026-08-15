import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch.js'
import { registerMetricsRoutes } from '../metrics.js'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Collection } from '../../core/collection.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-test-'))
}

async function createTestApp(): Promise<{ server: http.Server; dataDir: string; url: string; app: Solarch }> {
  const dataDir = tmpDir()
  const app = new Solarch({
    hideStartBanner: true,
    defaultDataDir: dataDir,
    defaultDev: true,
  })

  const ep = express()
  ep.use(express.json())
  ep.use(express.urlencoded({ extended: true }))

  ep.use((req: any, _res: any, next: any) => {
    if (req.headers['x-bypass-auth'] === 'true') {
      req.authContext = { record: null, isAdmin: false, token: null }
    } else if (req.headers['x-no-auth'] === 'true') {
      req.authContext = undefined
    } else {
      req.authContext = { record: null, isAdmin: true, token: 'test-admin-token' }
    }
    next()
  })

  await app.bootstrap()
  await app.migrate()

  registerMetricsRoutes(app, ep)

  return new Promise((resolve) => {
    const server = ep.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any
      resolve({
        server,
        dataDir,
        app,
        url: `http://127.0.0.1:${addr.port}`,
      })
    })
  })
}

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  return {
    status: res.status,
    body: res.status !== 204 ? await res.json().catch(() => null) : null,
  }
}

describe('GET /api/metrics', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: Solarch }

  beforeAll(async () => {
    ctx = await createTestApp()

    // Create Base collections
    const base1 = new Collection({ name: 'base1', type: 'base', fields: [{ name: 'name', type: 'text' }] })
    const base2 = new Collection({ name: 'base2', type: 'base', fields: [{ name: 'val', type: 'number' }] })
    
    // Create Auth collection
    const auth1 = new Collection({ name: 'auth1', type: 'auth', fields: [{ name: 'custom_col', type: 'text' }] })
    
    // Create View collection
    const view1 = new Collection({ name: 'view1', type: 'view', viewOptions: { query: 'SELECT 1' }, fields: [] })
    
    await ctx.app.save(base1)
    await ctx.app.save(base2)
    await ctx.app.save(auth1)
    await ctx.app.save(view1)

    // For base and auth collections, the save hook does NOT automatically create tables in tests 
    // unless the record crud routes or createRecordTable is hooked. We must create the tables manually.
    const db = ctx.app.db().getDataDB()
    
    db.prepare(`CREATE TABLE IF NOT EXISTS _r_${base1.id} (id TEXT PRIMARY KEY)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS _r_${base2.id} (id TEXT PRIMARY KEY)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS _r_${auth1.id} (id TEXT PRIMARY KEY)`).run()

    // Insert dummy records
    // base1 = 3 records
    db.prepare(`INSERT INTO _r_${base1.id} (id) VALUES ('r1'), ('r2'), ('r3')`).run()
    
    // base2 = 2 records
    db.prepare(`INSERT INTO _r_${base2.id} (id) VALUES ('r4'), ('r5')`).run()
    
    // auth1 = 4 records
    db.prepare(`INSERT INTO _r_${auth1.id} (id) VALUES ('r6'), ('r7'), ('r8'), ('r9')`).run()
  })

  afterAll(async () => {
    ctx.server.close()
    if (ctx.app && ctx.app.db()) {
      try {
        ctx.app.db().getDataDB().close()
        ctx.app.db().getAuxDB().close()
      } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('rejects unauthenticated request', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/metrics`, {
      headers: { 'x-no-auth': 'true' }
    })
    expect(status).toBe(403)
  })

  it('rejects unauthorized/non-admin request', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/metrics`, {
      headers: { 'x-bypass-auth': 'true' }
    })
    expect(status).toBe(403) // requireSuperuserAuth gives 403 or 401 for false isAdmin, typically 403. Let's see what it is actually. Usually 401/403.
  })

  it('returns correct aggregated metrics for authenticated superuser', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/metrics`)
    
    expect(status).toBe(200)
    
    // 4 custom collections + _superusers = 5 total. But wait, `findAllCollections()` returns all `Collection` objects in `_collections`.
    // Let's check how many were added: base1, base2, auth1, view1 = 4. 
    // Usually Solarch doesn't pre-populate base collections in tests unless explicitly done.
    expect(body.totalCollections).toBeGreaterThanOrEqual(4)
    
    // Base: 3 + 2 = 5
    // Auth: 4
    // Total Records should be 9
    // Auth Users should be 4
    
    expect(body.totalRecords).toBe(9)
    expect(body.totalAuthUsers).toBe(4)
  })
})
