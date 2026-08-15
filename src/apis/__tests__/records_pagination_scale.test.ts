/**
 * Pagination Scale Regression Tests
 *
 * Verifies that `totalItems` and `totalPages` reflect the complete authorized
 * record set regardless of dataset size. Guards against the confirmed blocker
 * where a hardcoded 10,000 candidate ceiling caused authorized records at
 * positions >10,000 to be silently invisible to the caller.
 *
 * Three datasets:
 *   Small  — 30 total, 4 authorized (original happy-path)
 *   Boundary — 10,001 not-mine + 4 mine (authorized records at positions 10,002–10,005)
 *   Large  — 15,000 not-mine + 10 mine (well above old ceiling)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch'
import { serve } from '../serve'
import { Collection } from '../../core/collection'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Pagination Authorization Scale (CORE-6)', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string

  let tokenA: string
  let tokenB: string
  let userAId: string
  let userBId: string
  let tableName: string

  const BASE = () => `http://127.0.0.1:${port}`

  async function post(path: string, body: object, token?: string) {
    return fetch(`${BASE()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  /** Insert records directly into SQLite to avoid HTTP overhead for large datasets. */
  async function bulkInsert(count: number, authorId: string, prefix: string, batchSize = 500) {
    const db = app.db()
    for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
      const n = Math.min(batchSize, count - batch * batchSize)
      const values = Array.from({ length: n }, (_, i) => {
        const idx = batch * batchSize + i + 1
        const id = `${prefix}${String(idx).padStart(12, '0')}`
        return `('${id}', 'Post ${idx}', '${authorId}', datetime('now'), datetime('now'))`
      }).join(',\n')
      await db.execute(`INSERT INTO ${tableName} (id, title, author, created, updated) VALUES ${values}`)
    }
  }

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-pag-scale-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()

    const usersCol = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'name', type: 'text' }],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(usersCol)

    // Expression-rule collection — list/view restricted to author=me
    const postsCol = new Collection({
      name: 'scale_posts', type: 'base',
      listRule: 'author = @request.auth.id',
      viewRule: 'author = @request.auth.id',
      createRule: '', updateRule: '', deleteRule: '',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'author', type: 'text' },
      ],
    })
    await app.save(postsCol)

    const collection = await app.findCollectionByNameOrId('scale_posts')
    tableName = `_r_${collection!.id}`

    server = await serve(app, 0)
    const addr = server.address() as any
    port = addr.port

    await post('/api/collections/users/records', { email: 'a@scale.local', password: 'password123456', passwordConfirm: 'password123456' })
    await post('/api/collections/users/records', { email: 'b@scale.local', password: 'password123456', passwordConfirm: 'password123456' })

    const authA = await (await post('/api/collections/users/auth-with-password', { identity: 'a@scale.local', password: 'password123456' })).json()
    const authB = await (await post('/api/collections/users/auth-with-password', { identity: 'b@scale.local', password: 'password123456' })).json()

    tokenA = authA.token
    tokenB = authB.token
    userAId = authA.record?.id
    userBId = authB.record?.id
  })

  afterAll(async () => {
    if (server) await new Promise<void>(r => server.close(() => r()))
    if (app) await app.db().close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // ── Small dataset (original happy-path, must remain correct) ───────────────
  it('PAG-1: 30 total records, 4 owned by User A → totalItems=4', async () => {
    // Insert 26 B-records and 4 A-records
    await bulkInsert(26, userBId, 'p1b')
    await bulkInsert(4, userAId, 'p1a')

    const res = await fetch(`${BASE()}/api/collections/scale_posts/records?page=1&perPage=50`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalItems).toBe(4)
    expect(body.items).toHaveLength(4)
    // All items must be owned by User A
    for (const item of body.items) {
      expect(item.author).toBe(userAId)
    }
  })

  // ── Boundary dataset: authorized records at positions 10,002–10,005 ────────
  it('PAG-2 [REGRESSION / BLOCKER]: 10,001 B-records then 4 A-records → totalItems=4', async () => {
    // Wipe all existing records from previous test
    await app.db().execute(`DELETE FROM ${tableName}`)

    // 10,001 User B records first
    await bulkInsert(10001, userBId, 'p2b')
    // 4 User A records at positions 10,002–10,005
    await bulkInsert(4, userAId, 'p2a')

    const res = await fetch(`${BASE()}/api/collections/scale_posts/records?page=1&perPage=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalItems).toBe(4)
    expect(body.items).toHaveLength(4)
    for (const item of body.items) {
      expect(item.author).toBe(userAId)
    }
  })

  // ── Large dataset: well above old ceiling ──────────────────────────────────
  it('PAG-3: 15,000 B-records then 10 A-records → totalItems=10', async () => {
    await app.db().execute(`DELETE FROM ${tableName}`)

    await bulkInsert(15000, userBId, 'p3b')
    await bulkInsert(10, userAId, 'p3a')

    const res = await fetch(`${BASE()}/api/collections/scale_posts/records?page=1&perPage=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalItems).toBe(10)
    expect(body.items).toHaveLength(10)
    for (const item of body.items) {
      expect(item.author).toBe(userAId)
    }
  })

  // ── Pagination metadata correctness ───────────────────────────────────────
  it('PAG-4: totalPages reflects authorized-only set, not DB total', async () => {
    await app.db().execute(`DELETE FROM ${tableName}`)

    await bulkInsert(10001, userBId, 'p4b')
    await bulkInsert(7, userAId, 'p4a')

    const res = await fetch(`${BASE()}/api/collections/scale_posts/records?page=1&perPage=3`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const body = await res.json()

    // 7 authorized records, perPage=3 → 3 pages
    expect(body.totalItems).toBe(7)
    expect(body.totalPages).toBe(3)
    expect(body.items).toHaveLength(3)

    // Page 3 has the remaining 1 record
    const resP3 = await fetch(`${BASE()}/api/collections/scale_posts/records?page=3&perPage=3`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const bodyP3 = await resP3.json()
    expect(bodyP3.items).toHaveLength(1)
  })
})
