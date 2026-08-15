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

    // Test 400 validation error
    const err400 = ClientResponseError.fromApiResponse(
      { status: 400, statusText: 'Bad Request' },
      { code: 400, status: 'VALIDATION_FAILED', message: 'Validation failed.', data: { fieldErrors: { title: { code: 'required', message: 'Title is required' } } } }
    )
    expect(err400.isValidationFailed()).toBe(true)
    expect(err400.statusCode).toBe(400)
    expect(err400.getFieldErrors().title?.code).toBe('required')

    // Test 401 unauthorized
    const err401 = ClientResponseError.fromApiResponse({ status: 401, statusText: 'Unauthorized' }, { code: 401, status: 'UNAUTHORIZED', message: 'Unauthorized' })
    expect(err401.isUnauthorized()).toBe(true)

    // Test 403 forbidden
    const err403 = ClientResponseError.fromApiResponse({ status: 403, statusText: 'Forbidden' }, { code: 403, status: 'FORBIDDEN', message: 'Access denied.' })
    expect(err403.isForbidden()).toBe(true)

    // Test 429 rate limited
    const err429 = ClientResponseError.fromApiResponse({ status: 429, statusText: 'Too Many Requests' }, { code: 429, status: 'RATE_LIMITED', message: 'Too many requests' })
    expect(err429.isRateLimited()).toBe(true)

    // Test 500 internal error
    const err500 = ClientResponseError.fromApiResponse({ status: 500, statusText: 'Internal Error' }, { code: 500, status: 'INTERNAL_ERROR', message: 'Internal error' })
    expect(err500.isInternalError()).toBe(true)
  })

  it('Gate 2: ListResult structure matches server pagination envelope across edge cases', async () => {
    const testCol = new Collection({
      name: 'conformance_posts',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      fields: [{ name: 'title', type: 'text' }],
    })
    await app.save(testCol)

    // Insert 3 records
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
    await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post 3' }),
    })

    // Normal Page 1
    const res1 = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records?page=1&perPage=2`)
    const body1 = (await res1.json()) as ListResult<RecordModel>
    expect(body1.page).toBe(1)
    expect(body1.perPage).toBe(2)
    expect(body1.totalItems).toBe(3)
    expect(body1.totalPages).toBe(2)
    expect(body1.items.length).toBe(2)

    // Last Page 2
    const res2 = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records?page=2&perPage=2`)
    const body2 = (await res2.json()) as ListResult<RecordModel>
    expect(body2.page).toBe(2)
    expect(body2.items.length).toBe(1)

    // Beyond Last Page 99
    const res3 = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records?page=99&perPage=2`)
    const body3 = (await res3.json()) as ListResult<RecordModel>
    expect(body3.page).toBe(99)
    expect(body3.totalItems).toBe(3)
    expect(body3.items.length).toBe(0)
  })

  it('Gate 3: Realtime protocol handshake, subscription, ping/pong, and minimal mutation event payload', async () => {
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
    await new Promise((r) => setTimeout(r, 60))
    const connectedMsg = messages.find((m) => m.type === 'connected')
    expect(connectedMsg).toBeDefined()
    expect(connectedMsg.protocolVersion).toBe('1.0')

    // Subscribe
    ws.send(JSON.stringify({ type: 'subscribe', channels: ['conformance_posts'] }))
    await new Promise((r) => setTimeout(r, 60))
    const subscribedMsg = messages.find((m) => m.type === 'subscribed')
    expect(subscribedMsg).toBeDefined()

    // Trigger create
    const createRes = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Realtime Post' }),
    })
    const created = await createRes.json()

    await new Promise((r) => setTimeout(r, 60))
    const eventMsg = messages.find((m) => m.type === 'event')
    expect(eventMsg).toBeDefined()

    const payload = eventMsg.data as RealtimeEventPayload
    expect(payload.action).toBe('create')
    expect(payload.data).toEqual({ id: created.id })
    expect(payload.timestamp).toBeDefined()
    expect(payload.record).toBeUndefined()

    ws.close()
  })

  it('Gate 4: Pagination semantic authorization ensures 0 count leakage on locked or restricted collections', async () => {
    // Locked collection with null listRule
    const lockedCol = new Collection({
      name: 'conformance_locked',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: '',
      fields: [{ name: 'secret', type: 'text' }],
    })
    await app.save(lockedCol)

    // Insert 5 records into locked collection
    for (let i = 1; i <= 5; i++) {
      await fetch(`http://127.0.0.1:${port}/api/collections/conformance_locked/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: `Secret ${i}` }),
      })
    }

    // Public list request must return totalItems: 0 (no information leak of the 5 hidden records)
    const res = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_locked/records?page=1&perPage=10`)
    const body = (await res.json()) as ListResult<RecordModel>

    expect(res.status).toBe(200)
    expect(body.totalItems).toBe(0)
    expect(body.totalPages).toBe(1)
    expect(body.items).toEqual([])
  })

  it('Gate 5: Realtime broadcast isolation prevents raw record data leakage to unauthorized subscribers', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)
    const messages: any[] = []

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()))
    })

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })

    await new Promise((r) => setTimeout(r, 60))
    ws.send(JSON.stringify({ type: 'subscribe', channels: ['conformance_posts'] }))
    await new Promise((r) => setTimeout(r, 60))

    // Insert post with confidential fields
    const createRes = await fetch(`http://127.0.0.1:${port}/api/collections/conformance_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sensitive Title',
        confidentialNote: 'Top Secret Payload 12345',
      }),
    })
    const created = await createRes.json()

    await new Promise((r) => setTimeout(r, 60))
    const events = messages.filter((m) => m.type === 'event')
    expect(events.length).toBeGreaterThan(0)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.data.data.id).toBe(created.id)
    // Absolute invariant: broadcast MUST NOT leak confidential fields directly in websocket frame
    expect(lastEvent.data.confidentialNote).toBeUndefined()
    expect(lastEvent.data.record).toBeUndefined()
    expect(JSON.stringify(lastEvent).includes('Top Secret Payload 12345')).toBe(false)

    ws.close()
  })
})


