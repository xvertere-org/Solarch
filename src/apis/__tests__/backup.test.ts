import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-test-'))
}

import { loadAuthToken } from '../middlewares_auth'
import { hashPassword } from '../../tools/security/crypto'

async function createTestApp(): Promise<{ server: http.Server; dataDir: string; url: string; app: Solarch }> {
  process.env.JWT_SECRET = '12345678901234567890123456789012'
  const dataDir = tmpDir()
  const app = new Solarch({
    hideStartBanner: true,
    defaultDataDir: dataDir,
    defaultDev: true,
  })

  const ep = express()
  ep.use(express.json())
  ep.use(express.urlencoded({ extended: true }))
  ep.use(loadAuthToken(app))

  await app.bootstrap()
  await app.migrate()

  const { registerBackupRoutes } = await import('../backup.js')
  const { registerHealthRoutes } = await import('../health.js')
  registerHealthRoutes(app, ep)
  registerBackupRoutes(app, ep)

  const server = http.createServer(ep)
  const port = await new Promise<number>((resolve) => {
    server.listen(0, () => {
      const addr = server.address()
      resolve(typeof addr === 'object' && addr ? addr.port : 8091)
    })
  })

  return { server, dataDir, url: `http://localhost:${port}`, app }
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(url, init)
  const body = await res.json() as T
  return { status: res.status, body }
}

describe('Backup API', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: Solarch }
  let adminToken: string
  let userToken: string

  beforeAll(async () => {
    ctx = await createTestApp()
    const db = ctx.app.db().getDataDB()
    const passwordHash = await hashPassword('password123')
    
    // Setup Admin
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _superusers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        passwordHash TEXT,
        created TEXT,
        updated TEXT
      )
    `).run()
    db.prepare(`INSERT INTO _superusers (id, username, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`).run('su_1', 'admin@example.com', passwordHash, new Date().toISOString(), new Date().toISOString())
    adminToken = ctx.app.generateJWT({ id: 'su_1', type: 'admin' }, ctx.app.getJwtSecret(), '1h')

    // Setup User
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _users (id TEXT PRIMARY KEY, email TEXT UNIQUE, passwordHash TEXT, collectionId TEXT)
    `).run()
    db.prepare(`INSERT INTO _users (id, email, passwordHash, collectionId) VALUES (?, ?, ?, ?)`).run('u_1', 'user@example.com', passwordHash, 'col1')
    userToken = ctx.app.generateJWT({ id: 'u_1', type: 'auth', collectionId: 'col1' }, ctx.app.getJwtSecret(), '1h')
  })

  afterAll(async () => {
    ctx.server.close()
    if (ctx.app && ctx.app.db()) {
      try {
        ctx.app.db().getDataDB().close()
        ctx.app.db().getAuxDB().close()
      } catch {}
    }
    // Give sqlite time to release locks
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('GET /api/backups without token returns 403 (or 401 based on contract)', async () => {
    // The contract for requireSuperuserAuth actually returns 403 when req.authContext.isAdmin is false, regardless of token presence.
    const { status } = await fetchJson(`${ctx.url}/api/backups`)
    expect(status).toBe(403)
  })

  it('GET /api/backups with non-admin token returns 403', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/backups`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
    expect(status).toBe(403)
  })

  it('GET /api/backups returns empty list initially', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  it('POST /api/backups creates a backup', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'test-backup' }),
    })
    expect(status).toBe(200)
    expect(body.data.key).toBe('test-backup.zip')
    expect(body.data.size).toBeGreaterThan(0)
  })

  it('GET /api/backups lists created backups', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(200)
    expect(body.length).toBeGreaterThanOrEqual(1)
    expect(body.some((b: any) => b.key === 'test-backup.zip')).toBe(true)
  })

  it('POST /api/backups with auto-generated name', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    })
    expect(status).toBe(200)
    expect(body.data.key).toMatch(/^backup_\d+\.zip$/)
  })

  it('POST /api/backups rejects duplicate name', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'test-backup' }),
    })
    expect(status).toBe(409)
  })

  it('DELETE /api/backups/:key removes a backup', async () => {
    const listRes = await fetchJson(`${ctx.url}/api/backups`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    const key = listRes.body[0].key

    const delRes = await fetch(`${ctx.url}/api/backups/${encodeURIComponent(key)}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(delRes.status).toBe(204)

    const { body } = await fetchJson(`${ctx.url}/api/backups`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(body.some((b: any) => b.key === key)).toBe(false)
  })

  it('DELETE /api/backups/:key returns 404 for missing backup', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups/nonexistent.zip`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(404)
  })

  it('POST /api/backups/:key/restore restores a backup', async () => {
    const { body: createBody } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'restore-test' }),
    })
    const key = createBody.data.key

    const { status, body } = await fetchJson(`${ctx.url}/api/backups/${encodeURIComponent(key)}/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(200)
    expect(body.message).toContain('restored')
  })

  it('POST /api/backups/:key/restore handles concurrent restores (429)', async () => {
    const { body: createBody } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'concurrent-test' }),
    })
    const key = createBody.data.key
    
    // Using fetch directly so we can fire them off concurrently without awaiting the first one immediately
    const req1 = fetch(`${ctx.url}/api/backups/${encodeURIComponent(key)}/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    const req2 = fetch(`${ctx.url}/api/backups/${encodeURIComponent(key)}/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })

    const [res1, res2] = await Promise.all([req1, req2])
    const statuses = [res1.status, res2.status]
    expect(statuses).toContain(200)
    // The rejected request might get 429 (lock) or 403 (DB replaced before auth token could be validated)
    expect(statuses.some(s => s === 429 || s === 403)).toBe(true)
  })

  it('POST /api/backups/:key/restore returns 404 for missing backup', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/backups/missing.zip/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(404)
  })

  it('POST /api/backups/:key/restore prevents path traversal', async () => {
    // Try to restore a file outside the backups directory using traversal payloads
    const payloads = [
      '../../data.db',
      '..%2F..%2Fdata.db',
      '..\\..\\data.db',
      '....//....//data.db',
      encodeURIComponent('../../data.db')
    ]
    
    for (const payload of payloads) {
      const res = await fetch(`${ctx.url}/api/backups/${payload}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      // The API uses path.basename(key).replace(/\.\./g, ''), which means any traversal resolves 
      // safely to a non-existent file inside the backup folder, resulting in 404. 
      expect(res.status).toBe(404)
    }
  })

  it('POST /api/backups/:key/restore fails safely on corrupt archive and releases lock', async () => {
    // 1. Upload a corrupt backup (just a text file masquerading as a zip)
    const blob = new Blob(['Not a real zip archive data...'], { type: 'application/zip' })
    const formData = new FormData()
    formData.append('file', blob, 'corrupt-test.zip')

    const uploadRes = await fetch(`${ctx.url}/api/backups/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    })
    const body = await uploadRes.json()
    const key = body.data.key

    // 2. Attempt to restore it
    const restoreRes = await fetch(`${ctx.url}/api/backups/${encodeURIComponent(key)}/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    // It should fail during extraction and return 500
    expect(restoreRes.status).toBe(500)

    // 3. Verify the _backupInProgress lock was released by attempting a normal backup creation
    const { status: createStatus } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'post-corrupt-test' }),
    })
    expect(createStatus).toBe(200) // If it returns 429, the lock wasn't released!
  })

  it('POST /api/backups/upload accepts a zip file', async () => {
    const JSZip = require('jszip')
    const zip = new JSZip()
    zip.file('test.txt', 'hello')
    const buf = await zip.generateAsync({ type: 'nodebuffer' })

    const blob = new Blob([buf], { type: 'application/zip' })
    const formData = new FormData()
    formData.append('file', blob, 'upload-test.zip')

    const res = await fetch(`${ctx.url}/api/backups/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.key).toBe('upload-test.zip')
  })
})

describe('Health endpoint', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: Solarch }
  let adminToken: string

  beforeAll(async () => {
    ctx = await createTestApp()
    const db = ctx.app.db().getDataDB()
    const passwordHash = await hashPassword('password123')
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _superusers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        passwordHash TEXT,
        created TEXT,
        updated TEXT
      )
    `).run()
    db.prepare(`INSERT INTO _superusers (id, username, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`).run('su_1', 'admin@example.com', passwordHash, new Date().toISOString(), new Date().toISOString())
    adminToken = ctx.app.generateJWT({ id: 'su_1', type: 'admin' }, ctx.app.getJwtSecret(), '1h')
  })

  afterAll(async () => {
    ctx.server.close()
    if (ctx.app && ctx.app.db()) {
      try {
        ctx.app.db().getDataDB().close()
        ctx.app.db().getAuxDB().close()
      } catch {}
    }
    await new Promise(r => setTimeout(r, 100))
    fs.rmSync(ctx.dataDir, { recursive: true, force: true })
  })

  it('GET /api/health returns ok for non-admin', async () => {
    const res = await fetch(`${ctx.url}/api/health`)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
  })

  it('GET /api/health returns details for admin', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(status).toBe(200)
    expect(body.message).toBe('Healthy')
    expect(body.timestamp).toBeDefined()
  })
})
