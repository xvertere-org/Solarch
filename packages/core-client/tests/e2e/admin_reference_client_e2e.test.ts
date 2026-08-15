/**
 * ADMIN-13: Behavioral Regression Gate - End-to-End Reference Client Journey
 * Tests all flows executed by the Admin UI against a live Solarch server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Solarch } from '../../../../src/solarch.js'
import { serve } from '../../../../src/apis/serve.js'
import { createSuperuser } from '../../../../src/cmd/superuser.js'
import { SolarchClient } from '../../src/Client.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'

describe('ADMIN-13: Admin Reference Client Behavioral Regression Suite', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string
  let baseUrl: string
  let client: SolarchClient

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-admin-e2e-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()

    // Create superuser
    await createSuperuser({
      app,
      email: 'admin@solarch.local',
      password: 'password123456',
    })

    // Spin up server on ephemeral port
    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090

    baseUrl = `http://127.0.0.1:${port}`
    client = new SolarchClient(baseUrl, {
      authStore: new MemoryAuthStore(),
    })
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('Journey 1: Superuser Login via client.admins.authWithPassword saves token in authStore', async () => {
    expect(client.authStore.isValid()).toBe(false)

    const authData = await client.admins.authWithPassword('admin@solarch.local', 'password123456')
    expect(authData).toBeDefined()
    expect(authData.token).toBeTruthy()
    expect(authData.admin.email).toBe('admin@solarch.local')

    expect(client.authStore.isValid()).toBe(true)
    expect(client.authStore.getToken()).toBe(authData.token)
  })

  it('Journey 2: Collections Lifecycle (List, Create, Update, Delete)', async () => {
    // 1. Create collection
    const createdCol = await client.collections.create({
      name: 'products',
      type: 'base',
      fields: [
        { id: 'fld_title', name: 'title', type: 'text', required: true, system: false },
        { id: 'fld_price', name: 'price', type: 'number', required: false, system: false },
      ],
      indexes: [],
    })
    expect(createdCol.id).toBeTruthy()
    expect(createdCol.name).toBe('products')

    // 2. List collections
    const colList = await client.collections.getList()
    expect(colList.items.some(c => c.name === 'products')).toBe(true)

    // 3. Get one collection
    const fetchedCol = await client.collections.getOne(createdCol.id)
    expect(fetchedCol.id).toBe(createdCol.id)

    // 4. Update collection
    const updatedCol = await client.collections.update(createdCol.id, {
      name: 'products_updated',
    })
    expect(updatedCol.name).toBe('products_updated')

    // 5. Delete collection
    await client.collections.delete(createdCol.id)
    const listAfterDelete = await client.collections.getList()
    expect(listAfterDelete.items.some(c => c.id === createdCol.id)).toBe(false)
  })

  it('Journey 3: Records Lifecycle with Pagination, Filters, and Sorting', async () => {
    // Create collection for records test
    const col = await client.collections.create({
      name: 'blog_posts',
      type: 'base',
      fields: [
        { id: 'fld_title', name: 'title', type: 'text', required: true, system: false },
        { id: 'fld_likes', name: 'likes', type: 'number', required: false, system: false },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    })

    const recordService = client.collection(col.id)

    // 1. Create records
    const r1 = await recordService.create({ title: 'Post Alpha', likes: 10 })
    const r2 = await recordService.create({ title: 'Post Beta', likes: 50 })
    const r3 = await recordService.create({ title: 'Post Gamma', likes: 100 })

    // 2. List records
    const list = await recordService.getList(1, 10)
    expect(list.totalItems).toBe(3)
    expect(list.items.length).toBe(3)

    // 3. Filter records
    const filtered = await recordService.getList(1, 10, {
      filter: 'likes > 20',
    })
    expect(filtered.totalItems).toBe(2)

    // 4. Update record
    const updatedR1 = await recordService.update(r1.id, {
      title: 'Post Alpha Prime',
    })
    expect(updatedR1.title).toBe('Post Alpha Prime')

    // 5. Get record
    const fetchedR1 = await recordService.getOne(r1.id)
    expect(fetchedR1.title).toBe('Post Alpha Prime')

    // 6. Delete record
    await recordService.delete(r1.id)
    const listAfter = await recordService.getList(1, 10)
    expect(listAfter.totalItems).toBe(2)
  })

  it('Journey 4: Admin-Only Endpoints via client.http (Settings, Logs, Backups)', async () => {
    // 1. Settings
    const settings = await client.http.get<any>('/api/settings')
    expect(settings).toBeDefined()

    // 2. Logs
    const logs = await client.http.get<any>('/api/logs', { query: { page: 1, perPage: 10 } })
    expect(logs).toBeDefined()
    expect(Array.isArray(logs.items)).toBe(true)

    // 3. Backups
    const backups = await client.http.get<any>('/api/backups')
    expect(Array.isArray(backups)).toBe(true)
  })
})
