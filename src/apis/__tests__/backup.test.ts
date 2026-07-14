import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TspoonBase } from '../../tspoonbase'
import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tspoonbase-test-'))
}

async function createTestApp(): Promise<{ server: http.Server; dataDir: string; url: string; app: TspoonBase }> {
  const dataDir = tmpDir()
  const app = new TspoonBase({
    hideStartBanner: true,
    defaultDataDir: dataDir,
    defaultDev: true,
  })

  const ep = express()
  ep.use(express.json())
  ep.use(express.urlencoded({ extended: true }))

  // Mock admin auth context for testing (can be bypassed with X-Bypass-Auth header)
  ep.use((req: any, _res: any, next: any) => {
    if (req.headers['x-bypass-auth'] === 'true') {
      req.authContext = { record: null, isAdmin: false, token: null }
    } else {
      req.authContext = { record: null, isAdmin: true, token: 'test-admin-token' }
    }
    next()
  })

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
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }

  beforeAll(async () => {
    ctx = await createTestApp()
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

  it('GET /api/backups returns empty list initially', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`)
    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  it('POST /api/backups creates a backup', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-backup' }),
    })
    expect(status).toBe(200)
    expect(body.data.key).toBe('test-backup.zip')
    expect(body.data.size).toBeGreaterThan(0)
  })

  it('GET /api/backups lists created backups', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`)
    expect(status).toBe(200)
    expect(body.length).toBeGreaterThanOrEqual(1)
    expect(body.some((b: any) => b.key === 'test-backup.zip')).toBe(true)
  })

  it('POST /api/backups with auto-generated name', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(status).toBe(200)
    expect(body.data.key).toMatch(/^backup_\d+\.zip$/)
  })

  it('POST /api/backups rejects duplicate name', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-backup' }),
    })
    expect(status).toBe(409)
  })

  it('DELETE /api/backups/:key removes a backup', async () => {
    const listRes = await fetchJson(`${ctx.url}/api/backups`)
    const key = listRes.body[0].key

    const delRes = await fetch(`${ctx.url}/api/backups/${encodeURIComponent(key)}`, { method: 'DELETE' })
    expect(delRes.status).toBe(204)

    const { body } = await fetchJson(`${ctx.url}/api/backups`)
    expect(body.some((b: any) => b.key === key)).toBe(false)
  })

  it('DELETE /api/backups/:key returns 404 for missing backup', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/backups/nonexistent.zip`, {
      method: 'DELETE',
    })
    expect(status).toBe(404)
  })

  it('POST /api/backups/:key/restore restores a backup', async () => {
    const { body: createBody } = await fetchJson(`${ctx.url}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'restore-test' }),
    })
    const key = createBody.data.key

    const { status, body } = await fetchJson(`${ctx.url}/api/backups/${encodeURIComponent(key)}/restore`, {
      method: 'POST',
    })
    expect(status).toBe(200)
    expect(body.message).toContain('restored')
  })

  it('POST /api/backups/:key/restore returns 404 for missing backup', async () => {
    const { status } = await fetchJson(`${ctx.url}/api/backups/missing.zip/restore`, {
      method: 'POST',
    })
    expect(status).toBe(404)
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
      body: formData,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.key).toBe('upload-test.zip')
  })
})

describe('Health endpoint', () => {
  let ctx: { server: http.Server; dataDir: string; url: string; app: TspoonBase }

  beforeAll(async () => {
    ctx = await createTestApp()
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
    const res = await fetch(`${ctx.url}/api/health`, {
      headers: { 'X-Bypass-Auth': 'true' },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
  })

  it('GET /api/health returns details for admin', async () => {
    const { status, body } = await fetchJson(`${ctx.url}/api/health`)
    expect(status).toBe(200)
    expect(body.message).toBe('Healthy')
    expect(body.timestamp).toBeDefined()
  })
})
