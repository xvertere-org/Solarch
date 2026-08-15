import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { WebSocket } from 'ws'
import { Solarch } from '../../../../src/solarch.js'
import { serve } from '../../../../src/apis/serve.js'
import { Collection } from '../../../../src/core/collection.js'
import {
  ClientResponseError,
  type ListResult,
  type RealtimeEventPayload,
  type RecordAuthResponse,
  type RecordModel,
} from '../../src/contracts/index.js'

describe('CORE-CLIENT-1.5: Backend ↔ SDK Contract Conformance Gate', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sdk-conformance-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()
    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090
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

  it('Gate 1: ClientResponseError faithfully parses server canonical error envelopes', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/collections/nonexistent_col/records`)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toHaveProperty('code', 404)
    expect(body).toHaveProperty('status', 'NOT_FOUND')

    const clientErr = ClientResponseError.fromApiResponse(res, body)
    expect(clientErr).toBeInstanceOf(ClientResponseError)
    expect(clientErr.statusCode).toBe(404)
    expect(clientErr.status).toBe('NOT_FOUND')
    expect(clientErr.isNotFound()).toBe(true)
    expect(clientErr.isUnauthorized()).toBe(false)
  })

  it('Gate 2: ListResult structure matches server pagination envelope 1:1', async () => {
    const testCol = new Collection({
      name: 'conformance_posts',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      fields: [{ name: 'title', type: 'text' }],
    })
    await app.save(testCol)

    // Insert 2 records
    await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post 1' }),
    })
    await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post 2' }),
    })

    const res = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records?page=1&perPage=1`)
    const body = (await res.json()) as ListResult<RecordModel>

    expect(body.page).toBe(1)
    expect(body.perPage).toBe(1)
    expect(body.totalItems).toBe(2)
    expect(body.totalPages).toBe(2)
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBe(1)
    expect(['Post 1', 'Post 2']).toContain(body.items[0]!.title)
  })

  it('Gate 3: RealtimeEventPayload structure matches server mutation broadcasts', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)
    const messages: any[] = []

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()))
    })

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })

    // Wait for handshake
    await new Promise((r) => setTimeout(r, 50))
    expect(messages.some((m) => m.type === 'connected')).toBe(true)

    // Subscribe
    ws.send(JSON.stringify({ type: 'subscribe', channels: ['conformance_posts'] }))
    await new Promise((r) => setTimeout(r, 50))
    expect(messages.some((m) => m.type === 'subscribed')).toBe(true)

    // Trigger create
    const createRes = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post 3' }),
    })
    const created = await createRes.json()

    await new Promise((r) => setTimeout(r, 50))
    const eventMsg = messages.find((m) => m.type === 'event')
    expect(eventMsg).toBeDefined()

    const payload = eventMsg.data as RealtimeEventPayload
    expect(payload.action).toBe('create')
    expect(payload.data).toEqual({ id: created.id })
    expect(payload.timestamp).toBeDefined()
    expect(payload.record).toBeUndefined()

    ws.close()
  })
})
