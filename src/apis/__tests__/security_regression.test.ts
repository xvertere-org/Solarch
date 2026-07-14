import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { TspoonBase } from '../../tspoonbase.js'
import { registerAuthRoutes } from '../record_auth.js'
import { registerRecordCRUDRoutes } from '../record_crud.js'
import { Collection } from '../../core/collection.js'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-security-'))
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

describe('Security Regression', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e'.repeat(32)
    const dataDir = tmpDir()
    const app = new TspoonBase({ hideStartBanner: true, defaultDataDir: dataDir, defaultDev: true })
    
    await app.bootstrap()
    await app.migrate()
    
    const collection = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'username', type: 'text' }], indexes: [],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(collection)
    
    const ep = express()
    ep.use(express.json())
    registerAuthRoutes(app, ep)
    registerRecordCRUDRoutes(app, ep)

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

  it('SQL Injection: payload in auth should be escaped and fail login', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: "' OR 1=1 --", password: 'SomePassword123!', collectionIdOrName: 'users' })
    })
    // If it was injectable, it might return 200 or 500
    // We expect it to gracefully fail with 400 Invalid credentials
    expect(status).toBe(400)
    expect(body.message).toBe('Invalid login credentials.')
  })

  it('SQL Injection: payload in collectionId should fail', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'test', password: 'test', collectionIdOrName: "' OR 1=1 --" })
    })
    expect(status).toBe(400)
    expect(body.message).toBe('Invalid collection.')
  })
})
