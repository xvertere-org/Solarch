import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { TspoonBase } from '../../tspoonbase.js'
import { registerPasswordResetRoutes, registerVerificationRoutes, registerEmailChangeRoutes, registerImpersonateRoutes } from '../auth_flows.js'
import { Collection } from '../../core/collection.js'
import { hashPassword, verifyPassword } from '../../tools/security/crypto.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-authflows-'))
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

describe('Auth Flows', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let authCollection: Collection
  let userId: string
  let adminToken: string

  beforeAll(async () => {
    process.env.JWT_SECRET = 'd'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    
    await app.bootstrap()
    await app.migrate()
    
    authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(authCollection)

    const db = app.db().getDataDB()
    
    // Create superuser for impersonation test
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
    db.prepare(`INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`).run(adminId, 'admin@example.com', await hashPassword('AdminPass123!'), new Date().toISOString(), new Date().toISOString())
    adminToken = app.generateJWT({ id: adminId, type: 'admin' }, app.getJwtSecret(), '1h')
    
    // Create a normal user
    userId = 'user123456789012'
    const passwordHash = await hashPassword('ValidPassword123!')
    db.prepare(`INSERT INTO _r_${authCollection.id} (id, email, passwordHash, verified, created, updated) VALUES (?, ?, ?, ?, ?, ?)`).run(
      userId, 'flow@example.com', passwordHash, 0, new Date().toISOString(), new Date().toISOString()
    )

    const ep = express()
    ep.use(express.json())
    ep.use((req: any, _res: any, next: any) => {
      // Mock loadAuthToken logic for requiresAuth / admin checks
      if (req.headers.authorization?.startsWith('Bearer ctx_admin')) {
         req.authContext = { record: null, isAdmin: true, token: req.headers.authorization }
      } else if (req.headers.authorization?.startsWith('Bearer ctx_user')) {
         req.authContext = { record: { id: userId, email: 'flow@example.com' }, isAdmin: false, token: req.headers.authorization }
      } else {
         req.authContext = { record: null, isAdmin: false, token: null }
      }
      next()
    })
    
    registerPasswordResetRoutes(app, ep)
    registerVerificationRoutes(app, ep)
    registerEmailChangeRoutes(app, ep)
    registerImpersonateRoutes(app, ep)

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

  it('Email verification: E2E flow', async () => {
    // 1. Request verification
    const { status: reqStatus } = await fetchJson(`${ctx.url}/api/collections/users/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'flow@example.com' })
    })
    expect(reqStatus).toBe(200)

    // 2. Generate a valid verification token
    const token = ctx.app.generateJWT(
      { id: userId, type: 'verifyEmail', collectionId: authCollection.id },
      ctx.app.getJwtSecret(),
      '2h'
    )

    // 3. Confirm verification
    const { status: confStatus } = await fetchJson(`${ctx.url}/api/collections/users/confirm-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    })
    expect(confStatus).toBe(200)

    // 4. Verify in DB
    const db = ctx.app.db().getDataDB()
    const user = db.prepare(`SELECT verified FROM _r_${authCollection.id} WHERE id = ?`).get(userId) as any
    expect(user.verified).toBe(1)
  })

  it('Password reset: E2E flow', async () => {
    // 2. Request reset
    const { status: reqStatus } = await fetchJson(`${ctx.url}/api/collections/users/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'flow@example.com' })
    })
    expect(reqStatus).toBe(200)

    // 3. Get generated token from DB
    const db = ctx.app.db().getDataDB()
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    db.prepare(`INSERT INTO _passwordResetTokens (userId, type, tokenHash, expiresAt, created) VALUES (?, ?, ?, ?, ?)`).run(
      userId, `collection_${authCollection.id}`, tokenHash, new Date(Date.now() + 3600000).toISOString(), new Date().toISOString()
    )

    // 3. Confirm reset
    const newPassword = 'NewPassword123!'
    const { status: confStatus } = await fetchJson(`${ctx.url}/api/collections/users/confirm-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: newPassword, passwordConfirm: newPassword })
    })
    expect(confStatus).toBe(200)

    // 4. Verify DB changes
    const user = db.prepare(`SELECT passwordHash FROM _r_${authCollection.id} WHERE id = ?`).get(userId) as any
    const verifyValid = await verifyPassword(newPassword, user.passwordHash)
    expect(verifyValid).toBe(true)
  })

  it('Change email: E2E flow', async () => {
    // 1. Request email change
    const newEmail = 'new-flow@example.com'
    const userToken = ctx.app.generateJWT(
      { id: userId, type: 'auth', collectionId: authCollection.id },
      ctx.app.getJwtSecret(),
      '1h'
    )
    const { status: reqStatus } = await fetchJson(`${ctx.url}/api/collections/users/request-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ newEmail, password: 'NewPassword123!' }) // from previous test
    })
    expect(reqStatus).toBe(200)

    // 2. Generate token
    const changeToken = ctx.app.generateJWT(
      { id: userId, type: 'changeEmail', collectionId: authCollection.id, newEmail },
      ctx.app.getJwtSecret(),
      '2h'
    )

    // 3. Confirm email change
    const { status: confStatus } = await fetchJson(`${ctx.url}/api/collections/users/confirm-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: changeToken, password: 'NewPassword123!' })
    })
    expect(confStatus).toBe(200)

    // 4. Verify DB
    const db = ctx.app.db().getDataDB()
    const user = db.prepare(`SELECT email FROM _r_${authCollection.id} WHERE id = ?`).get(userId) as any
    expect(user.email).toBe(newEmail)
  })

  it('Impersonation: admin can impersonate, user cannot', async () => {
    // 1. User tries to impersonate
    const { status: userStatus } = await fetchJson(`${ctx.url}/api/collections/users/impersonate/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer ctx_user' },
    })
    expect(userStatus).toBe(403) // requireSuperuserAuth protects this route

    // 2. Admin tries to impersonate
    const { status: adminStatus, body: adminBody } = await fetchJson(`${ctx.url}/api/collections/users/impersonate/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer ctx_admin' },
    })
    expect(adminStatus).toBe(200)
    expect(adminBody.token).toBeDefined()
    expect(adminBody.record.id).toBe(userId)
  })
})
