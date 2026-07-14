import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { TspoonBase } from '../../tspoonbase.js'
import { registerAuthRoutes } from '../record_auth.js'
import { registerRecordCRUDRoutes } from '../record_crud.js'
import { Collection } from '../../core/collection.js'
import { clearAttempts } from '../../utils/lockout.js'
import { oauth2Registry } from '../../tools/auth/oauth2.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-record-'))
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

describe('Record Auth', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let authCollection: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'c'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    
    await app.bootstrap()
    await app.migrate()
    
    authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8, allowOAuth2Auth: true },
    })
    await app.save(authCollection)
    
    const ep = express()
    ep.use(express.json())
    ep.use((req: any, _res: any, next: any) => {
      // Mock auth context for MFA tests where auth is required
      if (req.headers.authorization?.startsWith('Bearer ctx_')) {
         req.authContext = { record: { id: req.headers.authorization.split('_')[1] }, isAdmin: false, token: req.headers.authorization }
      } else {
         req.authContext = { record: null, isAdmin: false, token: null }
      }
      next()
    })
    
    registerAuthRoutes(app, ep)
    registerRecordCRUDRoutes(app, ep)

    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => resolve((server.address() as any).port))
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }

    // Setup dummy OAuth provider
    oauth2Registry.register({
      name: 'github',
      displayName: 'GitHub',
      clientId: 'id',
      clientSecret: 'secret',
      authURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      userURL: 'https://api.github.com/user',
      pkce: false,
      getUser: async (token) => {
        if (token === 'bad_token') return { id: '', email: '', name: '' }
        return { id: 'gh123', email: 'githubuser@example.com', name: 'GitHub User' }
      }
    })
  })

  afterAll(async () => {
    ctx?.server?.close()
    try { ctx?.app?.db().getDataDB().close(); ctx?.app?.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    if (ctx?.dataDir) fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    clearAttempts(`record:${authCollection.id}:test@example.com`)
  })

  it('Registration: Valid creation', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', username: 'testuser', password: 'ValidPassword123!', passwordConfirm: 'ValidPassword123!' })
    })
    expect(status).toBe(201)
    expect(body.record.email).toBe('test@example.com')
    // passwordHash should not be exposed
    expect(body.record.passwordHash).toBeUndefined()
  })

  it('Registration: Edge Cases (duplicate email)', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', username: 'another', password: 'ValidPassword123!', passwordConfirm: 'ValidPassword123!' })
    })
    expect(status).toBe(400)
    expect(body.errors.some((e: any) => e.field === 'email')).toBe(true)
  })

  it('Login: Valid credentials', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'test@example.com', password: 'ValidPassword123!', collectionIdOrName: 'users' })
    })
    expect(status).toBe(200)
    expect(body.token).toBeDefined()
    expect(body.record.email).toBe('test@example.com')
  })

  it('Unverified users rejection (if onlyVerified is true)', async () => {
    // Modify collection to require verification
    authCollection.authOptions!.onlyVerified = true
    await ctx.app.save(authCollection)
    
    // We created test@example.com, but its verified flag is 0 by default.
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'test@example.com', password: 'ValidPassword123!', collectionIdOrName: 'users' })
    })
    expect(status).toBe(403)
    expect(body.message).toBe('Email not verified.')

    // Restore collection
    authCollection.authOptions!.onlyVerified = false
    await ctx.app.save(authCollection)
  })

  it('OTP Auth flow: Request and Verify', async () => {
    // 1. Request OTP
    const { status: reqStatus, body: reqBody } = await fetchJson(`${ctx.url}/api/collections/users/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
    expect(reqStatus).toBe(200)
    expect(reqBody.otpId).toBeDefined()

    const db = ctx.app.db().getDataDB()
    const otpRow = db.prepare(`SELECT password FROM _otps WHERE id = ?`).get(reqBody.otpId) as any
    // We can't know the generated plaintext password because it is sent via email (which is not configured).
    // So for the test, we'll manually overwrite it to a known hash so we can test the verification endpoint.
    const knownPassword = '123456'
    const hash = crypto.createHash('sha256').update(knownPassword).digest('hex')
    db.prepare(`UPDATE _otps SET password = ? WHERE id = ?`).run(hash, reqBody.otpId)

    // 2. Verify OTP
    const { status: verStatus, body: verBody } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpId: reqBody.otpId, password: knownPassword })
    })
    expect(verStatus).toBe(200)
    expect(verBody.token).toBeDefined()
    expect(verBody.record.email).toBe('test@example.com')
  })

  it('MFA/TOTP setup & verify', async () => {
    const db = ctx.app.db().getDataDB()
    const user = db.prepare(`SELECT id FROM _r_${authCollection.id} WHERE email = 'test@example.com'`).get() as any
    const token = ctx.app.generateJWT({ id: user.id, type: 'auth', collectionId: authCollection.id }, ctx.app.getJwtSecret(), '1h')

    const { status: setupStatus, body: setupBody } = await fetchJson(`${ctx.url}/api/collections/users/mfa/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` }
    })
    expect(setupStatus).toBe(200)
    expect(setupBody.secret).toBeDefined()
    
    // Now if we login with password, it should require MFA
    const { status: loginStatus, body: loginBody } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'test@example.com', password: 'ValidPassword123!', collectionIdOrName: 'users' })
    })
    expect(loginStatus).toBe(200)
    expect(loginBody.mfaRequired).toBe(true)
    expect(loginBody.token).toBeDefined() // this is an mfa token
  })
})
