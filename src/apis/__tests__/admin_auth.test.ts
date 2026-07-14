import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { TspoonBase } from '../../tspoonbase.js'
import { registerAdminAuthRoutes } from '../admin_auth.js'
import { hashPassword, verifyPassword } from '../../tools/security/crypto.js'
import { clearAttempts } from '../../utils/lockout.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-admin-'))
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

describe('Admin Auth', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  const ADMIN_EMAIL = 'admin@example.com'
  const ADMIN_PASS = 'SecureAdminPass123!'
  let adminId: string

  beforeAll(async () => {
    process.env.JWT_SECRET = 'b'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    
    await app.bootstrap()
    await app.migrate()
    
    const db = app.db().getDataDB()
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS _superusers (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          created TEXT NOT NULL,
          updated TEXT NOT NULL
        )
    `)
    adminId = 'admin123'
    const passwordHash = await hashPassword(ADMIN_PASS)
    db.prepare(`INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`).run(adminId, ADMIN_EMAIL, passwordHash, new Date().toISOString(), new Date().toISOString())
    
    const ep = express()
    ep.use(express.json())
    registerAdminAuthRoutes(app, ep)

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

  beforeEach(() => {
    clearAttempts(`admin:${ADMIN_EMAIL}`)
  })

  it('Login: valid credentials -> returns JWT and admin meta', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    })
    expect(status).toBe(200)
    expect(body.token).toBeDefined()
    expect(body.admin.id).toBe(adminId)
    expect(body.admin.email).toBe(ADMIN_EMAIL)
  })

  it('Login: invalid credentials -> 400', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: 'WrongPassword1!' })
    })
    expect(status).toBe(400)
    expect(body.message).toBe('Invalid credentials.')
  })

  it('Brute-force: lock out after 10 failed attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await fetchJson(`${ctx.url}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: 'WrongPassword1!' })
      })
    }

    // 11th attempt should return 429 even with correct credentials
    const { status, body } = await fetchJson(`${ctx.url}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    })
    expect(status).toBe(429)
    // adminAuthRateLimiter hits first and returns 429
    expect(body.message).toContain('Too many authentication attempts')
  })

  it('Token Refresh: valid token -> returns new token and revokes old', async () => {
    const originalToken = ctx.app.generateJWT({ id: adminId, type: 'admin' }, ctx.app.getJwtSecret(), '1h')
    const { status, body } = await fetchJson(`${ctx.url}/api/admins/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${originalToken}` },
    })
    expect(status).toBe(200)
    expect(body.token).toBeDefined()
    expect(body.token).not.toBe(originalToken)
    expect(body.admin.id).toBe(adminId)

    // Verify original token is revoked in DB
    const db = ctx.app.db().getDataDB()
    const revoked = db.prepare(`SELECT * FROM _tokenRevocations WHERE tokenHash = ?`).get(
      crypto.createHash('sha256').update(originalToken).digest('hex')
    )
    expect(revoked).toBeDefined()
  })

  it('Token Refresh: revoked token -> 401', async () => {
    const originalToken = ctx.app.generateJWT({ id: adminId, type: 'admin' }, ctx.app.getJwtSecret(), '1h')
    // Manually revoke it
    ctx.app.revokeToken(originalToken, 'admin_refresh', adminId, 5)

    const { status } = await fetchJson(`${ctx.url}/api/admins/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${originalToken}` },
    })
    expect(status).toBe(401)
  })

  it('Token Refresh: expired token -> 401', async () => {
    const expiredToken = ctx.app.generateJWT({ id: adminId, type: 'admin' }, ctx.app.getJwtSecret(), '-1h')
    const { status } = await fetchJson(`${ctx.url}/api/admins/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${expiredToken}` },
    })
    expect(status).toBe(401)
  })

  it('Password Reset: E2E flow changes password and revokes token', async () => {
    // 1. Request Reset
    const { status: reqStatus } = await fetchJson(`${ctx.url}/api/admins/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL })
    })
    expect(reqStatus).toBe(200)
    
    // We can manually generate one and hash it into the DB.
    const db = ctx.app.db().getDataDB()
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    db.prepare(`INSERT INTO _passwordResetTokens (userId, type, tokenHash, expiresAt, created) VALUES (?, ?, ?, ?, ?)`).run(adminId, 'admin', tokenHash, new Date(Date.now() + 3600000).toISOString(), new Date().toISOString())

    // 2. Confirm Reset
    const newPassword = 'NewAdminPassword123!'
    const { status: confStatus } = await fetchJson(`${ctx.url}/api/admins/confirm-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: newPassword, passwordConfirm: newPassword })
    })
    expect(confStatus).toBe(200)

    // 3. Verify DB state (passwordHash changed)
    const adminRow = db.prepare(`SELECT passwordHash FROM _superusers WHERE id = ?`).get(adminId) as any
    const verifyValid = await verifyPassword(newPassword, adminRow.passwordHash)
    expect(verifyValid).toBe(true)

    // 4. Verify token reuse is prevented
    const { status: reuseStatus } = await fetchJson(`${ctx.url}/api/admins/confirm-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'AnotherPassword1!', passwordConfirm: 'AnotherPassword1!' })
    })
    expect(reuseStatus).toBe(400)
  })
})
