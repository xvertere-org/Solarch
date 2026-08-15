import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { WebSocket } from 'ws'
import { Solarch } from '../../../../src/solarch.js'
import { serve } from '../../../../src/apis/serve.js'
import { Collection } from '../../../../src/core/collection.js'
import { SolarchClient, ClientResponseError } from '../../src/index.js'

describe('CORE-CLIENT-8: Live SolarchClient End-to-End Suite', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string
  let client: SolarchClient

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sdk-e2e-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()

    // Create users auth collection for auth tests
    const usersCol = new Collection({
      name: 'users',
      type: 'auth',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [{ name: 'name', type: 'text' }],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(usersCol)

    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090

    // Initialize SolarchClient with custom WebSocket factory for Node environment
    client = new SolarchClient(`http://127.0.0.1:${port}`, {
      wsFactory: (url) => new WebSocket(url) as any,
    })
  })

  afterAll(async () => {
    client.realtime.disconnect()
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    if (app) {
      await app.db().close()
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('1. Capabilities Service: queries health and resolves server database capabilities', async () => {
    const caps = await client.capabilities.get()
    expect(caps.protocolVersion).toBe('1.0')
    expect(caps.database.provider).toBe('sqlite')
    expect(await client.capabilities.supportsTransactions()).toBe(true)
    expect(await client.capabilities.supportsBackups()).toBe(true)
  })

  it('2. Record CRUD: executes complete lifecycle against live collection', async () => {
    const postCol = new Collection({
      name: 'articles',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'content', type: 'text' },
        { name: 'views', type: 'number' },
      ],
    })
    await app.save(postCol)

    const articles = client.collection('articles')

    // CREATE
    const created = await articles.create({
      title: 'Solarch Core Client Guide',
      content: 'Building universal SDKs',
      views: 10,
    })
    expect(created.id).toBeDefined()
    expect(created.title).toBe('Solarch Core Client Guide')
    expect(created.views).toBe(10)

    // GET ONE
    const fetched = await articles.getOne(created.id)
    expect(fetched.id).toBe(created.id)
    expect(fetched.content).toBe('Building universal SDKs')

    // UPDATE
    let updated: any
    try {
      updated = await articles.update(created.id, {
        views: 25,
      })
    } catch (err: any) {
      console.log('DEBUG UPDATE ERR DATA:', JSON.stringify(err.data), err.message)
      throw err
    }
    expect(updated.views).toBe(25)

    // GET LIST
    const list = await articles.getList(1, 10)
    expect(list.totalItems).toBe(1)
    expect(list.items.length).toBe(1)
    expect(list.items[0]!.id).toBe(created.id)

    // GET FULL LIST
    const fullList = await articles.getFullList()
    expect(fullList.length).toBe(1)

    // GET FIRST LIST ITEM
    const first = await articles.getFirstListItem("title ~ 'Core Client'")
    expect(first.id).toBe(created.id)

    // DELETE
    const deleted = await articles.delete(created.id)
    expect(deleted).toBe(true)

    // Verify 404
    try {
      await articles.getOne(created.id)
      expect.unreachable('Should have thrown ClientResponseError on deleted record')
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.statusCode).toBe(404)
      expect(err.isNotFound()).toBe(true)
    }
  })

  it('3. Record Auth Flows: registers, authenticates with password, and stores JWT in authStore', async () => {
    const users = client.collection('users')

    // Register user
    const userRes: any = await users.create({
      email: 'sdk_user@example.com',
      password: 'password123456',
      passwordConfirm: 'password123456',
    })
    const user = userRes.record || userRes
    expect(user.id).toBeDefined()

    // Auth with password
    const authData = await users.authWithPassword('sdk_user@example.com', 'password123456')
    expect(authData.token).toBeDefined()
    expect(authData.record.id).toBe(user.id)

    // Auth store should now be valid and hold user model
    expect(client.authStore.isValid()).toBe(true)
    expect(client.authStore.getToken()).toBe(authData.token)
    expect(client.authStore.getModel()?.id).toBe(user.id)

    // Clear auth
    client.authStore.clear()
    expect(client.authStore.isValid()).toBe(false)
    expect(client.authStore.getToken()).toBe('')
  })

  it('4. Files Service: constructs clean asset URLs with query options', () => {
    const mockRecord = {
      id: 'rec_file_123',
      collectionName: 'profiles',
    }

    const url = client.files.getUrl(mockRecord, 'avatar.png', {
      thumb: '100x100',
      download: true,
    })

    expect(url).toBe(
      `http://127.0.0.1:${port}/api/files/profiles/rec_file_123/avatar.png?thumb=100x100&download=true`
    )
  })

  it('5. Realtime Service: subscribes and receives minimal mutation event with autoFetch option', async () => {
    const liveCol = new Collection({
      name: 'live_feed',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      fields: [{ name: 'headline', type: 'text' }],
    })
    await app.save(liveCol)

    const feed = client.collection('live_feed')
    const receivedEvents: any[] = []

    const unsub = await feed.subscribe(
      (e) => {
        receivedEvents.push(e)
      },
      { autoFetch: true }
    )

    // Wait 100ms for subscription frame
    await new Promise((r) => setTimeout(r, 100))

    // Create record via SDK
    const created = await feed.create({
      headline: 'Breaking Realtime News',
    })

    // Wait for event delivery and autoFetch
    await new Promise((r) => setTimeout(r, 200))

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
    const event = receivedEvents[0]
    expect(event.action).toBe('create')
    expect(event.data).toEqual({ id: created.id })
    expect(event.record).toBeDefined()
    expect(event.record.headline).toBe('Breaking Realtime News')

    await unsub()
  })
})
