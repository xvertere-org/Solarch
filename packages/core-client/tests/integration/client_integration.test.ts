import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Solarch } from '../../../../src/solarch.js'
import { serve } from '../../../../src/apis/serve.js'
import { createSuperuser } from '../../../../src/cmd/superuser.js'
import { SolarchClient } from '../../src/Client.js'

describe('CORE-CLIENT-8: Client ↔ Server Integration Suite', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string
  let client: SolarchClient

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sdk-integration-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()
    await createSuperuser({
      app,
      email: 'admin@solarch.local',
      password: 'password123456',
    })

    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090

    client = new SolarchClient(`http://127.0.0.1:${port}`)
    await client.admins.authWithPassword('admin@solarch.local', 'password123456')
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    if (app) {
      await app.db().close()
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('1. Collections Schema Management: creates, fetches, and lists collections', async () => {
    const col = await client.collections.create({
      name: 'integration_articles',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { id: 'fld_title', name: 'title', type: 'text', required: true },
        { id: 'fld_content', name: 'content', type: 'text', required: false },
      ],
      indexes: [],
    })

    expect(col.id).toBeDefined()
    expect(col.name).toBe('integration_articles')

    const fetched = await client.collections.getOne('integration_articles')
    expect(fetched.id).toBe(col.id)

    const list = await client.collections.getList(1, 10)
    expect(list.items.some((c) => c.name === 'integration_articles')).toBe(true)
  })

  it('2. Capabilities Integration: verifies truthful server health and status', async () => {
    const health = await client.capabilities.getHealth()
    expect(health.code).toBe(200)
    expect(health.message).toBe('Healthy')
    expect(health.data?.dbConnected).toBe(true)
    expect(await client.capabilities.isHealthy()).toBe(true)
  })

  it('3. Record CRUD Integration: creates, queries, updates, and deletes records', async () => {
    const service = client.collection('integration_articles')

    const record = await service.create({
      title: 'First Article',
      content: 'Hello World',
    })
    expect(record.id).toBeDefined()
    expect(record.title).toBe('First Article')

    const one = await service.getOne(record.id)
    expect(one.title).toBe('First Article')

    const updated = await service.update(record.id, {
      title: 'Updated Article',
    })
    expect(updated.title).toBe('Updated Article')

    const list = await service.getList(1, 10)
    expect(list.totalItems).toBe(1)
    expect(list.items[0]?.title).toBe('Updated Article')

    await service.delete(record.id)
    const emptyList = await service.getList(1, 10)
    expect(emptyList.totalItems).toBe(0)
  })
})
