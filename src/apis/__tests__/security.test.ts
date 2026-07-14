
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TspoonBase } from '../../tspoonbase.js'
import { Collection } from '../../core/collection.js'
import { RecordModel as PBRecord } from '../../core/record.js'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-p0-'))
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(url, init)
  const body = await res.json() as T
  return { status: res.status, body }
}

describe('SEC-009: POST /api/realtime channel authorization', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new TspoonBase({
      hideStartBanner: true,
      defaultDataDir: dataDir,
      defaultDev: true,
    })

    const ep = express()
    ep.use(express.json())

    ep.use((req: any, _res: any, next: any) => {
      if (req.headers['x-test-admin'] === 'true') {
        req.authContext = { record: null, isAdmin: true, token: 'admin-token' }
      } else {
        req.authContext = { record: null, isAdmin: false, token: null }
      }
      next()
    })

    await app.bootstrap()
    await app.migrate()

    const privateCol = new Collection({
      name: 'secrets',
      type: 'base',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [{ name: 'data', type: 'text' }],
      indexes: [],
    })
    await app.save(privateCol)

    const publicCol = new Collection({
      name: 'posts',
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [{ name: 'title', type: 'text' }],
      indexes: [],
    })
    await app.save(publicCol)

    const { registerRealtimeRoutes } = await import('../realtime.js')
    registerRealtimeRoutes(app, ep)

    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 8091)
      })
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }
  })

  afterAll(async () => {
    ctx.server.close()
    if (ctx.app?.db()) {
      try {
        ctx.app.db().getDataDB().close()
        ctx.app.db().getAuxDB().close()
      } catch { }
    }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('anonymous user CANNOT subscribe to a private collection channel', async () => {
    const collectionId = (await ctx.app.findCollectionByNameOrId('secrets'))!.id
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'attacker-1',
        subscriptions: [{ action: 'subscribe', channel: `collections.${collectionId}.records` }],
      }),
    })

    // Must be denied — this was the pre-fix exploit vector
    expect(status).toBe(403)
    expect(body.code).toBe(403)
    expect(body.errors).toBeDefined()
    expect(body.errors.length).toBeGreaterThan(0)
    expect(body.errors[0].channel).toBe(`collections.${collectionId}.records`)
  })

  it('anonymous user CANNOT subscribe to a private channel by name', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'attacker-2',
        subscriptions: [{ action: 'subscribe', channel: 'collections.secrets.records' }],
      }),
    })

    expect(status).toBe(403)
    expect(body.code).toBe(403)
  })

  it('anonymous user CAN subscribe to a public collection channel', async () => {
    const collectionId = (await ctx.app.findCollectionByNameOrId('posts'))!.id
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'public-user-1',
        subscriptions: [{ action: 'subscribe', channel: `collections.${collectionId}.records` }],
      }),
    })

    expect(status).toBe(200)
    expect(body.code).toBe(200)
    expect(body.subscriptions).toContain(`collections.${collectionId}.records`)
  })

  it('admin CAN subscribe to a private collection channel', async () => {
    const collectionId = (await ctx.app.findCollectionByNameOrId('secrets'))!.id
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Admin': 'true',
      },
      body: JSON.stringify({
        clientId: 'admin-1',
        subscriptions: [{ action: 'subscribe', channel: `collections.${collectionId}.records` }],
      }),
    })

    expect(status).toBe(200)
    expect(body.code).toBe(200)
    expect(body.subscriptions).toContain(`collections.${collectionId}.records`)
  })

  it('anonymous user CANNOT subscribe to a non-collection channel', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'attacker-3',
        subscriptions: [{ action: 'subscribe', channel: 'system.logs' }],
      }),
    })

    // Non-collection channels require auth
    expect(status).toBe(403)
    expect(body.code).toBe(403)
  })

  it('subscription to non-existent collection is denied', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'attacker-4',
        subscriptions: [{ action: 'subscribe', channel: 'collections.nonexistent.records' }],
      }),
    })

    expect(status).toBe(403)
  })

  it('unsubscribe always works regardless of auth', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'any-client',
        subscriptions: [{ action: 'unsubscribe', channel: 'collections.secrets.records' }],
      }),
    })

    // Unsubscribe doesn't require auth and returns 200
    expect(status).toBe(200)
  })

  it('mixed subscribe results: partial success returns 200 with errors', async () => {
    const publicId = (await ctx.app.findCollectionByNameOrId('posts'))!.id
    const secretsId = (await ctx.app.findCollectionByNameOrId('secrets'))!.id

    const { status, body } = await fetchJson(`${ctx.url}/api/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'mixed-1',
        subscriptions: [
          { action: 'subscribe', channel: `collections.${publicId}.records` },
          { action: 'subscribe', channel: `collections.${secretsId}.records` },
        ],
      }),
    })

    // One succeeded, one failed — returns 200 with errors array
    expect(status).toBe(200)
    expect(body.subscriptions).toContain(`collections.${publicId}.records`)
    expect(body.subscriptions).not.toContain(`collections.${secretsId}.records`)
    expect(body.errors).toBeDefined()
    expect(body.errors.length).toBe(1)
  })
})


describe('BUG-006: oldPassword verification on password change', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }
  let authCollection: Collection
  let testRecordId: string
  const REAL_PASSWORD = 'CorrectPassword123!'

  beforeAll(async () => {
    const dataDir = tmpDir()
    const app = new TspoonBase({
      hideStartBanner: true,
      defaultDataDir: dataDir,
      defaultDev: true,
    })

    await app.bootstrap()
    await app.migrate()

    authCollection = new Collection({
      name: 'users',
      type: 'auth',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [{ name: 'username', type: 'text' }],
      indexes: [],
      authOptions: {
        allowEmailAuth: true,
        minPasswordLength: 8,
      },
    })
    await app.save(authCollection)

    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')
    const { record } = await validateAndCreateRecord(app, authCollection, {
      email: 'test@example.com',
      username: 'testuser',
      password: REAL_PASSWORD,
      passwordConfirm: REAL_PASSWORD,
    })
    await app.save(record)
    testRecordId = record.id

    const ep = express()
    ep.use(express.json())
    const server = http.createServer(ep)
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 8092)
      })
    })

    ctx = { server, dataDir, url: `http://localhost:${port}`, app }
  })

  afterAll(async () => {
    ctx?.server?.close()
    if (ctx?.app?.db()) {
      try {
        ctx.app.db().getDataDB().close()
        ctx.app.db().getAuxDB().close()
      } catch { }
    }
    await new Promise(r => setTimeout(r, 100))
    if (ctx?.dataDir) fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  async function getExistingRecord() {
    const { findRecordById } = await import('../../core/record_query.js')
    return (await findRecordById(ctx.app, 'users', testRecordId))!
  }

  it('REJECTS password change with WRONG oldPassword', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()

    const { errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      oldPassword: 'TotallyWrongPassword!',
      newPassword: 'HackedNewPassword1!',
      newPasswordConfirm: 'HackedNewPassword1!',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'oldPassword')).toBe(true)
    expect(errors[0].message).toContain('Incorrect')
  })

  it('REJECTS password change with EMPTY oldPassword', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()

    const { errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      oldPassword: '',
      newPassword: 'HackedNewPassword2!',
      newPasswordConfirm: 'HackedNewPassword2!',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'oldPassword')).toBe(true)
  })

  it('REJECTS password change with missing oldPassword', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()

    const { errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      newPassword: 'HackedNewPassword3!',
      newPasswordConfirm: 'HackedNewPassword3!',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'oldPassword')).toBe(true)
  })

  it('ACCEPTS password change with CORRECT oldPassword', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()

    const { record, errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      oldPassword: REAL_PASSWORD,
      newPassword: 'ValidNewPassword1!',
      newPasswordConfirm: 'ValidNewPassword1!',
    })

    expect(errors).toHaveLength(0)
    expect(record).toBeDefined()
    expect(record.get('passwordHash')).toBeDefined()
    expect(record.get('passwordHash')).not.toBe(REAL_PASSWORD)
    const valid = await ctx.app.verifyPassword('ValidNewPassword1!', record.get('passwordHash'))
    expect(valid).toBe(true)
  })

  it('new record creation (no oldPassword needed) still works', async () => {
    const { validateAndCreateRecord } = await import('../../core/record_upsert.js')

    const { record, errors } = await validateAndCreateRecord(ctx.app, authCollection, {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'NewUserPass123!',
      passwordConfirm: 'NewUserPass123!',
    })

    expect(errors).toHaveLength(0)
    expect(record).toBeDefined()
    expect(record.get('passwordHash')).toBeDefined()
  })

  it('update without password fields still works', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()

    const { record, errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      username: 'updatedusername',
    })

    expect(errors).toHaveLength(0)
    expect(record).toBeDefined()
    expect(record.get('username')).toBe('updatedusername')
  })

  it('BYPASS ATTEMPT: using "password" field instead of "newPassword" is also blocked', async () => {
    const { validateAndUpdateRecord } = await import('../../core/record_upsert.js')
    const existingRecord = await getExistingRecord()
    const { errors } = await validateAndUpdateRecord(ctx.app, authCollection, existingRecord, {
      password: 'HackedViaPasswordField!',
      passwordConfirm: 'HackedViaPasswordField!',
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'oldPassword')).toBe(true)
  })
})
