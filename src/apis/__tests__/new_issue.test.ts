import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TspoonBase } from '../../tspoonbase.js'
import { Collection } from '../../core/collection.js'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-new-'))
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(url, init)
  const body = await res.json() as T
  return { status: res.status, body }
}

describe('NEW-001: passwordHash injection blocked', () => {
  let ctx: { app: TspoonBase; dataDir: string; authCollection: Collection }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
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
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let authCollection: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'a'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })

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
  let ctx: { app: TspoonBase; dataDir: string; authCollection: Collection }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
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
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let authCollection: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'b'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })

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

    const token = ctx.app.generateJWT(
      { id: user1Row.id, type: 'changeEmail', collectionId: authCollection.id, newEmail: 'user2@example.com' },
      ctx.app.getJwtSecret(),
      '1h'
    )

    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/confirm-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    expect(status).toBe(400)
    expect(body.message).toContain('already in use')
  })
})
