import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch.js'
import { Collection } from '../../core/collection.js'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-new-'))
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(url, init)
  const body = await res.json() as T
  return { status: res.status, body }
}

describe('NEW-001: passwordHash injection blocked', () => {
  let ctx: { app: Solarch; dataDir: string; authCollection: Collection }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    await app.bootstrap()
    await app.migrate()

    const authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(authCollection)
    ctx = { app, dataDir, authCollection }
  })

  afterAll(async () => {
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('REJECTS passwordHash in create request body', async () => {
    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record } = await validateAndCreateRecord(ctx.app, ctx.authCollection, {
      email: 'inject@evil.com',
      username: 'injector',
      password: 'LegitPassword123!',
      passwordConfirm: 'LegitPassword123!',
      passwordHash: '$2b$10$attacker-injected-hash-value',
    })
    await ctx.app.save(record)

    const storedHash = record.get('passwordHash')
    expect(storedHash).not.toBe('$2b$10$attacker-injected-hash-value')
    const valid = await ctx.app.verifyPassword('LegitPassword123!', storedHash)
    expect(valid).toBe(true)
  })

  it('REJECTS passwordHash in update request body', async () => {
    const { validateAndCreateRecord, validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const { record: created } = await validateAndCreateRecord(ctx.app, ctx.authCollection, {
      email: 'target@example.com', username: 'target',
      password: 'OriginalPass123!', passwordConfirm: 'OriginalPass123!',
    })
    await ctx.app.save(created)

    const { findRecordById } = await import('../../core/record_query.js')
    const existing = await findRecordById(ctx.app, 'users', created.id)

    const { record: updated, errors } = await validateAndUpdateRecord(
      ctx.app, ctx.authCollection, existing!, {
      passwordHash: '$2b$10$attacker-injected-hash',
    }
    )

    expect(errors).toHaveLength(0)
    const storedHash = updated.get('passwordHash')
    expect(storedHash).not.toBe('$2b$10$attacker-injected-hash')
  })

  it('REJECTS +passwordHash modifier injection', async () => {
    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record } = await validateAndCreateRecord(ctx.app, ctx.authCollection, {
      email: 'plus@evil.com', username: 'plusinjector',
      password: 'LegitPassword123!', passwordConfirm: 'LegitPassword123!',
      '+passwordHash': 'injected-via-plus',
    })

    const storedHash = record.get('passwordHash')
    expect(storedHash).not.toContain('injected-via-plus')
  })
})

describe('NEW-002: passwordHash hidden in auth responses', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: Solarch }
  let authCollection: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'a'.repeat(32)
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })

    const ep = express()
    ep.use(express.json())
    ep.use((req: any, _res: any, next: any) => {
      req.authContext = { record: null, isAdmin: false, token: null }
      next()
    })

    await app.bootstrap()
    await app.migrate()

    authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(authCollection)

    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record } = await validateAndCreateRecord(app, authCollection, {
      email: 'test@example.com', username: 'testuser',
      password: 'SecurePass123!', passwordConfirm: 'SecurePass123!',
    })
    await app.save(record)

    const { registerAuthRoutes } = await import('../record_auth.js')
    registerAuthRoutes(app, ep)

    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 8093)
      })
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }
  })

  afterAll(async () => {
    ctx.server.close()
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('password login response does NOT contain passwordHash', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'test@example.com', password: 'SecurePass123!' }),
    })

    expect(status).toBe(200)
    expect(body.token).toBeDefined()
    expect(body.record).toBeDefined()
    expect(body.record.passwordHash).toBeUndefined()
    expect(body.record.lastResetSentAt).toBeUndefined()
  })
})

describe('NEW-004: Password length validation on reset', () => {
  let ctx: { app: Solarch; dataDir: string; authCollection: Collection }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    await app.bootstrap()
    await app.migrate()

    const authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 10 },
    })
    await app.save(authCollection)
    ctx = { app, dataDir, authCollection }
  })

  afterAll(async () => {
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('password creation respects minPasswordLength from collection settings', async () => {
    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')

    const { errors } = await validateAndCreateRecord(ctx.app, ctx.authCollection, {
      email: 'short@example.com', username: 'shortpass',
      password: 'Short1!', passwordConfirm: 'Short1!',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'password')).toBe(true)
  })

  it('valid password length passes validation', async () => {
    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')

    const { record, errors } = await validateAndCreateRecord(ctx.app, ctx.authCollection, {
      email: 'valid@example.com', username: 'validpass',
      password: 'ValidPassword123!', passwordConfirm: 'ValidPassword123!',
    })

    expect(errors).toHaveLength(0)
    expect(record).toBeDefined()
  })
})

describe('NEW-005: Email change uniqueness', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: Solarch }
  let authCollection: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'b'.repeat(32)
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })

    const ep = express()
    ep.use(express.json())
    ep.use((req: any, _res: any, next: any) => {
      req.authContext = { record: null, isAdmin: false, token: null }
      next()
    })

    await app.bootstrap()
    await app.migrate()

    authCollection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(authCollection)

    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record: user1 } = await validateAndCreateRecord(app, authCollection, {
      email: 'user1@example.com', username: 'user1',
      password: 'Password123!', passwordConfirm: 'Password123!',
    })
    await app.save(user1)
    const { record: user2 } = await validateAndCreateRecord(app, authCollection, {
      email: 'user2@example.com', username: 'user2',
      password: 'Password123!', passwordConfirm: 'Password123!',
    })
    await app.save(user2)

    const { registerEmailChangeRoutes } = await import('../auth_flows.js')
    registerEmailChangeRoutes(app, ep)

    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 8094)
      })
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }
  })

  afterAll(async () => {
    ctx.server.close()
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('email change to existing email returns 400 not 500', async () => {
    const db = ctx.app.db().getDataDB()
    const user1Row = db.prepare(`SELECT * FROM _r_${authCollection.id} WHERE email = ?`).get('user1@example.com') as any

    const token = ctx.app.createPasswordResetToken(user1Row.id, `emailChange:${authCollection.id}`, 2, 'user2@example.com')

    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/confirm-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    expect(status).toBe(400)
    expect(body.message).toContain('already in use')
  })
})

describe('SEC-004: Auth token on record create blocks if onlyVerified is true', () => {
  let ctx: { app: Solarch; dataDir: string }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    await app.bootstrap()
    await app.migrate()
    ctx = { app, dataDir }
  })

  afterAll(async () => {
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('does NOT return token if onlyVerified is true', async () => {
    const collection = new Collection({
      name: 'users_verified', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8, onlyVerified: true },
    })
    await ctx.app.save(collection)

    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record } = await validateAndCreateRecord(ctx.app, collection, {
      email: 'testverified@example.com',
      username: 'testverified',
      password: 'Password123!',
      passwordConfirm: 'Password123!',
    })
    await ctx.app.save(record)

    const ep = express()
    ep.use(express.json())
    const { registerRecordCRUDRoutes } = await import('../record_crud.js')
    registerRecordCRUDRoutes(ctx.app, ep)

    const request = require('supertest')
    const res = await request(ep)
      .post('/api/collections/users_verified/records')
      .send({
        email: 'another@example.com',
        username: 'another',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeUndefined()
    expect(res.body.id).toBeDefined()
  })

  it('returns token if onlyVerified is false', async () => {
    const collection = new Collection({
      name: 'users_unverified', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8, onlyVerified: false },
    })
    await ctx.app.save(collection)

    const ep = express()
    ep.use(express.json())
    const { registerRecordCRUDRoutes } = await import('../record_crud.js')
    registerRecordCRUDRoutes(ctx.app, ep)

    const request = require('supertest')
    const res = await request(ep)
      .post('/api/collections/users_unverified/records')
      .send({
        email: 'unverified@example.com',
        username: 'unverified',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.record).toBeDefined()
  })
})

describe('SEC-008: WebSocket realtime channel subscription authentication', () => {
  let ctx: { app: Solarch; dataDir: string; privateCol: Collection; publicCol: Collection }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new Solarch({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    await app.bootstrap()
    await app.migrate()

    const privateCol = new Collection({
      name: 'private_col', type: 'auth', system: false,
      listRule: null, viewRule: null, createRule: '', updateRule: '', deleteRule: '',
      fields: [], indexes: [],
    })
    await app.save(privateCol)

    const publicCol = new Collection({
      name: 'public_col', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [], indexes: [],
    })
    await app.save(publicCol)

    ctx = { app, dataDir, privateCol, publicCol }
  })

  afterAll(async () => {
    try { ctx.app.db().getDataDB().close(); ctx.app.db().getAuxDB().close() } catch { }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('rejects WebSocket subscription to private/restricted collections and non-collection channels', async () => {
    const { setupWebSocketRealtime } = await import('../realtime.js')
    
    const wssHandlers: any = {}
    const mockWss = {
      on: (event: string, handler: Function) => {
        wssHandlers[event] = handler
      }
    }

    setupWebSocketRealtime(mockWss, ctx.app)

    let sentMessages: string[] = []
    const mockWs = {
      readyState: 1, // OPEN
      send: (data: string) => {
        sentMessages.push(data)
      },
      on: (event: string, handler: Function) => {
        if (event === 'message') {
          mockWs.triggerMessage = handler
        }
      },
      triggerMessage: null as any
    }

    // Connect
    wssHandlers['connection'](mockWs, { url: '/api/realtime' })
    expect(sentMessages).toHaveLength(1)
    const connMsg = JSON.parse(sentMessages[0])
    expect(connMsg.type).toBe('connected')
    expect(connMsg.authenticated).toBe(false)

    sentMessages = []

    // Try to subscribe to private collection records (should be rejected)
    await mockWs.triggerMessage(JSON.stringify({
      type: 'subscribe',
      channels: [`collections.${ctx.privateCol.id}.records`]
    }))

    // Wait a brief tick for async handler to run
    await new Promise(r => setTimeout(r, 10))

    expect(sentMessages).toHaveLength(2)
    const errorMsg = JSON.parse(sentMessages[0])
    expect(errorMsg.type).toBe('error')
    expect(errorMsg.message).toContain('Not authorized')
    const finalSubMsg = JSON.parse(sentMessages[1])
    expect(finalSubMsg.type).toBe('subscribed')
    expect(finalSubMsg.channels).toHaveLength(0)

    sentMessages = []

    // Try to subscribe to public collection records (should succeed)
    await mockWs.triggerMessage(JSON.stringify({
      type: 'subscribe',
      channels: [`collections.${ctx.publicCol.id}.records`]
    }))

    await new Promise(r => setTimeout(r, 10))

    expect(sentMessages).toHaveLength(1)
    const subMsg = JSON.parse(sentMessages[0])
    expect(subMsg.type).toBe('subscribed')
  })
})

