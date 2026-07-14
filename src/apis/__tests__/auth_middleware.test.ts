import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { TspoonBase } from '../../tspoonbase.js'
import { loadAuthToken, requireAuth, requireSuperuserAuth, requireSameCollectionContextAuth, requireGuestOnly } from '../middlewares_auth.js'
import { Collection } from '../../core/collection.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-mw-'))
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

describe('Auth Middlewares', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let adminToken: string
  let userToken: string
  
  beforeAll(async () => {
    process.env.JWT_SECRET = 'a'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    
    await app.bootstrap()
    await app.migrate()
    
    const db = app.db().getDataDB()
    
    // Create admin
    db.exec(`
        CREATE TABLE IF NOT EXISTS _superusers (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          created TEXT NOT NULL,
          updated TEXT NOT NULL
        )
    `)
    const adminId = 'admin123'
    db.prepare(`INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`).run(adminId, 'admin@example.com', 'hash', new Date().toISOString(), new Date().toISOString())
    adminToken = app.generateJWT({ id: adminId, type: 'admin' }, app.getJwtSecret(), '1h')
    
    // Create user collection
    const authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(authCollection)
    
    // Create user
    const userId = 'user123'
    db.prepare(`INSERT INTO _r_${authCollection.id} (id, email, passwordHash, verified, created, updated) VALUES (?, ?, ?, ?, ?, ?)`).run(userId, 'user@example.com', 'hash', 1, new Date().toISOString(), new Date().toISOString())
    userToken = app.generateJWT({ id: userId, type: 'auth', collectionId: authCollection.id }, app.getJwtSecret(), '1h')
    
    const ep = express()
    ep.use(express.json())
    ep.use(loadAuthToken(app))
    
    ep.get('/test-load', (req, res) => res.json({ ctx: req.authContext }))
    ep.get('/test-require-auth', requireAuth(app), (req, res) => res.json({ ok: true }))
    ep.get('/test-require-admin', requireSuperuserAuth(app), (req, res) => res.json({ ok: true }))
    ep.get('/test-require-guest', requireGuestOnly(), (req, res) => res.json({ ok: true }))
    ep.get('/test-require-collection/:collectionIdOrName', requireSameCollectionContextAuth('users'), (req, res) => res.json({ ok: true }))
    ep.get('/test-require-collection-invalid/:collectionIdOrName', requireSameCollectionContextAuth('admins'), (req, res) => res.json({ ok: true }))

    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => resolve((server.address() as any).port))
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }
  })

  afterAll(async () => {
    ctx?.server?.close()
    try { ctx?.app?.db().getDataDB().close(); ctx?.app?.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    if (ctx?.dataDir) fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  // loadAuthToken tests
  it('loadAuthToken: no token -> null context', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-load`)
    expect(status).toBe(200)
    expect(body.ctx.record).toBeNull()
    expect(body.ctx.isAdmin).toBe(false)
  })

  it('loadAuthToken: invalid token -> null context', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-load`, { headers: { authorization: 'Bearer invalid.token.here' } })
    expect(status).toBe(200)
    expect(body.ctx.record).toBeNull()
    expect(body.ctx.isAdmin).toBe(false)
  })

  it('loadAuthToken: tampered token (different secret) -> null context', async () => {
    const tamperedToken = ctx.app.generateJWT({ id: 'user123', type: 'auth', collectionId: 'users' }, 'different-secret', '1h')
    const { status, body } = await fetchJson(`${ctx.url}/test-load`, { headers: { authorization: `Bearer ${tamperedToken}` } })
    expect(status).toBe(200)
    expect(body.ctx.record).toBeNull()
    expect(body.ctx.isAdmin).toBe(false)
  })

  it('loadAuthToken: valid admin token -> isAdmin=true', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-load`, { headers: { authorization: `Bearer ${adminToken}` } })
    expect(status).toBe(200)
    expect(body.ctx.isAdmin).toBe(true)
    expect(body.ctx.token).toBe(adminToken)
  })

  it('loadAuthToken: valid user token -> record populated', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-load`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(200)
    expect(body.ctx.isAdmin).toBe(false)
    expect(body.ctx.record.id).toBe('user123')
  })

  // requireAuth tests
  it('requireAuth: missing token -> 401', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-require-auth`)
    expect(status).toBe(401)
    expect(body.message).toBe('Authentication required.')
  })

  it('requireAuth: valid user token -> 200', async () => {
    const { status } = await fetchJson(`${ctx.url}/test-require-auth`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(200)
  })

  // requireSuperuserAuth tests
  it('requireSuperuserAuth: user token -> 403', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-require-admin`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(403)
    expect(body.message).toBe('Superuser authentication required.')
  })

  it('requireSuperuserAuth: admin token -> 200', async () => {
    const { status } = await fetchJson(`${ctx.url}/test-require-admin`, { headers: { authorization: `Bearer ${adminToken}` } })
    expect(status).toBe(200)
  })

  // requireGuestOnly tests
  it('requireGuestOnly: missing token -> 200', async () => {
    const { status } = await fetchJson(`${ctx.url}/test-require-guest`)
    expect(status).toBe(200)
  })

  it('requireGuestOnly: valid user token -> 400', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-require-guest`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(400)
    expect(body.message).toBe('Only guests can access this endpoint.')
  })

  // requireSameCollectionContextAuth tests
  it('requireSameCollectionContextAuth: matches collection -> 200', async () => {
    const { status } = await fetchJson(`${ctx.url}/test-require-collection/users`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(200)
  })

  it('requireSameCollectionContextAuth: mismatches collection -> 403', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/test-require-collection-invalid/admins`, { headers: { authorization: `Bearer ${userToken}` } })
    expect(status).toBe(403)
    expect(body.message).toBe('Invalid collection context.')
  })
})