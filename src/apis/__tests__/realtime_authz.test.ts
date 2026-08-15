/**
 * Realtime Row-Level Authorization Regression Tests
 *
 * Verifies the two-stage authorization model:
 *   Stage 1 — Subscription gate: locked=deny, public=allow, expression=allow-if-authenticated
 *   Stage 2 — Broadcast gate: viewRule evaluated against actual mutated record per subscriber
 *
 * Regression guard for the confirmed blocker where canSubscribeToChannel evaluated
 * expression-based viewRule against the auth user object instead of a record,
 * blocking all subscriptions and all event delivery for expression-rule collections.
 *
 * Tests cover WS primary + SSE transport-parity minimum.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch'
import { serve } from '../serve'
import { Collection } from '../../core/collection'
import { WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wsFrames(
  ws: WebSocket,
  onOpen: () => void,
  stopPredicate: (frames: any[]) => boolean,
  timeoutMs = 2500
): Promise<any[]> {
  return new Promise((resolve) => {
    const frames: any[] = []
    const timer = setTimeout(() => {
      ws.close()
      resolve(frames)
    }, timeoutMs)

    ws.on('open', onOpen)
    ws.on('message', (data) => {
      const frame = JSON.parse(data.toString())
      frames.push(frame)
      if (stopPredicate(frames)) {
        clearTimeout(timer)
        ws.close()
        resolve(frames)
      }
    })
    ws.on('error', () => { clearTimeout(timer); resolve(frames) })
    ws.on('close', () => { clearTimeout(timer); resolve(frames) })
  })
}

function subscribe(ws: WebSocket, channels: string[]) {
  ws.send(JSON.stringify({ type: 'subscribe', channels }))
}

function waitForSubscribed(frames: any[]) {
  return frames.some(f => f.type === 'subscribed')
}

function hasEventFrame(frames: any[]) {
  return frames.some(f => f.type === 'event')
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Realtime Row-Level Authorization (RT-AUTHZ)', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string

  let tokenA: string
  let tokenB: string
  let tokenAdmin: string
  let userAId: string
  let userBId: string

  const BASE_URL = () => `http://127.0.0.1:${port}`
  const WS_URL = (token?: string) =>
    token ? `ws://127.0.0.1:${port}/api/realtime?token=${token}` : `ws://127.0.0.1:${port}/api/realtime`

  async function post(path: string, body: object, token?: string) {
    return fetch(`${BASE_URL()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-rt-authz-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()

    // Auth users collection
    const usersCol = new Collection({
      name: 'users', type: 'auth', system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'name', type: 'text' }],
      authOptions: { allowEmailAuth: true, minPasswordLength: 8 },
    })
    await app.save(usersCol)

    // Public collection (viewRule: '')
    const publicCol = new Collection({
      name: 'public_posts', type: 'base',
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [{ name: 'title', type: 'text' }],
    })
    await app.save(publicCol)

    // Locked collection (viewRule: null)
    const lockedCol = new Collection({
      name: 'locked_posts', type: 'base',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [{ name: 'title', type: 'text' }],
    })
    await app.save(lockedCol)

    // Expression-rule collection: author = @request.auth.id
    const privateCol = new Collection({
      name: 'private_posts', type: 'base',
      listRule: 'author = @request.auth.id',
      viewRule: 'author = @request.auth.id',
      createRule: '',
      updateRule: 'author = @request.auth.id',
      deleteRule: 'author = @request.auth.id',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'author', type: 'text' },
      ],
    })
    await app.save(privateCol)

    server = await serve(app, 0)
    const addr = server.address() as any
    port = addr.port

    // Create users
    await post('/api/collections/users/records', { email: 'a@test.local', password: 'password123456', passwordConfirm: 'password123456' })
    await post('/api/collections/users/records', { email: 'b@test.local', password: 'password123456', passwordConfirm: 'password123456' })

    const authA = await (await post('/api/collections/users/auth-with-password', { identity: 'a@test.local', password: 'password123456' })).json()
    const authB = await (await post('/api/collections/users/auth-with-password', { identity: 'b@test.local', password: 'password123456' })).json()

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

  // ─── Scenario 1: Public collection + anonymous subscriber ─────────────────
  it('S1: anonymous subscriber receives event on public collection', async () => {
    const ws = new WebSocket(WS_URL())
    let subscribed = false

    const frames = await wsFrames(ws, () => {}, (frames) => {
      if (!subscribed && frames.some(f => f.type === 'subscribed')) {
        subscribed = true
        post('/api/collections/public_posts/records', { title: 'public-anon' })
      }
      return hasEventFrame(frames)
    })

    const subFrame = frames.find(f => f.type === 'subscribed')
    // We need to actually subscribe first — rebuild with proper open handler
    ws.close()

    // Redo with proper open → subscribe → create flow
    const ws2 = new WebSocket(WS_URL())
    let triggered = false
    const frames2 = await wsFrames(ws2, () => {
      ws2.send(JSON.stringify({ type: 'subscribe', channels: ['public_posts'] }))
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        post('/api/collections/public_posts/records', { title: 'public-anon-event' })
      }
      return hasEventFrame(frames)
    })

    expect(frames2.some(f => f.type === 'event')).toBe(true)
  })

  // ─── Scenario 2: Public collection + authenticated subscriber ─────────────
  it('S2: authenticated subscriber receives event on public collection', async () => {
    const ws = new WebSocket(WS_URL(tokenA))
    let triggered = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['public_posts'])
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        post('/api/collections/public_posts/records', { title: 'public-auth-event' })
      }
      return hasEventFrame(frames)
    })

    expect(frames.some(f => f.type === 'event')).toBe(true)
  })

  // ─── Scenario 3: Locked collection + anonymous subscriber ─────────────────
  it('S3: anonymous subscriber subscription rejected on locked collection', async () => {
    const ws = new WebSocket(WS_URL())
    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['locked_posts'])
    }, (frames) => frames.some(f => f.type === 'subscribed' || f.type === 'error'))

    const errorFrame = frames.find(f => f.type === 'error')
    expect(errorFrame).toBeDefined()
    expect(errorFrame?.message).toContain('locked_posts')
    // Must not be in subscribed channels
    const subFrame = frames.find(f => f.type === 'subscribed')
    expect(subFrame?.channels ?? []).not.toContain('locked_posts')
  })

  // ─── Scenario 4: Locked collection + authenticated subscriber ─────────────
  it('S4: authenticated subscriber subscription rejected on locked collection', async () => {
    const ws = new WebSocket(WS_URL(tokenA))
    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['locked_posts'])
    }, (frames) => frames.some(f => f.type === 'subscribed' || f.type === 'error'))

    const errorFrame = frames.find(f => f.type === 'error')
    expect(errorFrame).toBeDefined()
    const subFrame = frames.find(f => f.type === 'subscribed')
    expect(subFrame?.channels ?? []).not.toContain('locked_posts')
  })

  // ─── Scenario 5: Expression rule + owner subscribes ───────────────────────
  it('S5: owner can subscribe to expression-rule collection', async () => {
    const ws = new WebSocket(WS_URL(tokenA))
    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => frames.some(f => f.type === 'subscribed'))

    const subFrame = frames.find(f => f.type === 'subscribed')
    // Subscription must succeed (no error for private_posts)
    const errorFrame = frames.find(f => f.type === 'error' && f.message?.includes('private_posts'))
    expect(errorFrame).toBeUndefined()
    expect(subFrame).toBeDefined()
  })

  // ─── Scenario 6: Expression rule + owner creates record → owner's WS ──────
  it('S6 [REGRESSION]: owner receives event for own create', async () => {
    const ws = new WebSocket(WS_URL(tokenA))
    let triggered = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        // Create record owned by User A
        post('/api/collections/private_posts/records', { title: 'A creates', author: userAId }, tokenA)
      }
      return hasEventFrame(frames)
    })

    expect(frames.some(f => f.type === 'event' && f.data?.action === 'create')).toBe(true)
  })

  // ─── Scenario 7: Expression rule + owner updates record → owner's WS ──────
  it('S7: owner receives event for own update', async () => {
    // Create a record first
    const created = await (await post('/api/collections/private_posts/records', { title: 'to-update', author: userAId }, tokenA)).json()
    const recordId = created.id

    const ws = new WebSocket(WS_URL(tokenA))
    let triggered = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        fetch(`${BASE_URL()}/api/collections/private_posts/records/${recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify({ title: 'updated' }),
        })
      }
      return hasEventFrame(frames)
    })

    expect(frames.some(f => f.type === 'event' && f.data?.action === 'update')).toBe(true)
  })

  // ─── Scenario 8: Expression rule + owner deletes record → owner's WS ──────
  it('S8: owner receives event for own delete', async () => {
    const created = await (await post('/api/collections/private_posts/records', { title: 'to-delete', author: userAId }, tokenA)).json()
    const recordId = created.id

    const ws = new WebSocket(WS_URL(tokenA))
    let triggered = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        fetch(`${BASE_URL()}/api/collections/private_posts/records/${recordId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenA}` },
        })
      }
      return hasEventFrame(frames)
    })

    expect(frames.some(f => f.type === 'event' && f.data?.action === 'delete')).toBe(true)
  })

  // ─── Scenario 9: Expression rule + non-owner receives nothing ─────────────
  it('S9 [REGRESSION / CORE INVARIANT]: non-owner receives no event for another owner\'s record', async () => {
    // User B subscribes; User A creates a record (author=A). B must receive nothing.
    const ws = new WebSocket(WS_URL(tokenB))
    let subscribed = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => {
      if (!subscribed && frames.some(f => f.type === 'subscribed')) {
        subscribed = true
        // User A creates a record — User B cannot view it
        post('/api/collections/private_posts/records', { title: 'A private post', author: userAId }, tokenA)
      }
      // Stop if we get an unexpected event, or after 2s timeout
      return hasEventFrame(frames)
    }, 2000)

    // User B must have received NO event frame
    expect(frames.some(f => f.type === 'event')).toBe(false)
    // User B subscription itself must succeed
    expect(frames.some(f => f.type === 'subscribed')).toBe(true)
  })

  // ─── Scenario 10: Admin receives all events ───────────────────────────────
  it('S10: admin receives event for any record in expression-rule collection', async () => {
    // Create an admin JWT
    const adminSecret = app.getJwtSecret()
    const adminToken = app.generateJWT({ type: 'admin', id: 'admin-test' }, adminSecret, '1h')

    const ws = new WebSocket(WS_URL(adminToken))
    let triggered = false

    const frames = await wsFrames(ws, () => {
      subscribe(ws, ['private_posts'])
    }, (frames) => {
      if (!triggered && frames.some(f => f.type === 'subscribed')) {
        triggered = true
        post('/api/collections/private_posts/records', { title: 'admin sees this', author: userBId }, tokenB)
      }
      return hasEventFrame(frames)
    })

    expect(frames.some(f => f.type === 'event')).toBe(true)
  })

  // ─── Scenario 11: autoFetch by non-owner returns 403/404 ─────────────────
  it('S11: non-owner cannot view another user\'s record via getOne', async () => {
    const created = await (await post('/api/collections/private_posts/records', { title: 'secret', author: userAId }, tokenA)).json()
    const recordId = created.id

    // User B tries to fetch User A's record directly
    const res = await fetch(`${BASE_URL()}/api/collections/private_posts/records/${recordId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })

    expect(res.status === 403 || res.status === 404).toBe(true)
  })

  // ─── Scenario 12: Two users, same collection — isolation ─────────────────
  it('S12 [CORE INVARIANT]: subscriber isolation — each user sees only their own records', async () => {
    // Phase 1: A and B subscribed. A creates. Only A receives event; B receives nothing.
    // Phase 2: A and B still subscribed. B creates. Only B receives event; A receives nothing.

    function openSubscribed(url: string, channel: string): Promise<{ ws: WebSocket; events: any[] }> {
      const events: any[] = []
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url)
        ws.on('error', reject)
        ws.on('open', () => ws.send(JSON.stringify({ type: 'subscribe', channels: [channel] })))
        ws.on('message', (data) => {
          const frame = JSON.parse(data.toString())
          if (frame.type === 'subscribed') resolve({ ws, events })
          if (frame.type === 'event') events.push(frame)
        })
      })
    }

    const { ws: wsA, events: eventsA } = await openSubscribed(WS_URL(tokenA), 'private_posts')
    const { ws: wsB, events: eventsB } = await openSubscribed(WS_URL(tokenB), 'private_posts')

    // ── Phase 1: A creates — A should get event, B should not ─────────────────
    const countA0 = eventsA.length
    const countB0 = eventsB.length
    await post('/api/collections/private_posts/records', { title: 'A only', author: userAId }, tokenA)
    await new Promise(r => setTimeout(r, 800))

    expect(eventsA.length - countA0).toBeGreaterThanOrEqual(1) // A received event
    expect(eventsB.length - countB0).toBe(0)                  // B received nothing

    // ── Phase 2: B creates — B should get event, A should not ─────────────────
    const countA1 = eventsA.length
    const countB1 = eventsB.length
    await post('/api/collections/private_posts/records', { title: 'B only', author: userBId }, tokenB)
    await new Promise(r => setTimeout(r, 800))

    expect(eventsB.length - countB1).toBeGreaterThanOrEqual(1) // B received event
    expect(eventsA.length - countA1).toBe(0)                   // A received nothing

    wsA.close()
    wsB.close()
  })

  // ─── SSE Transport Parity ─────────────────────────────────────────────────

  it('SSE-1: anonymous SSE client receives connected frame', async () => {
    // Basic SSE connectivity sanity-check (full event delivery over SSE requires
    // server-sent event stream integration; covered by protocol contract tests)
    const res = await fetch(`${BASE_URL()}/api/realtime`, {
      headers: { Accept: 'text/event-stream' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    // Read the first SSE frame
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    reader.cancel()
    expect(text).toContain('"type":"connected"')
    expect(text).toContain('"authenticated":false')
  })

  it('SSE-2: authenticated SSE client receives authenticated:true in connected frame', async () => {
    const res = await fetch(`${BASE_URL()}/api/realtime`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${tokenA}`,
      },
    })
    expect(res.status).toBe(200)
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    reader.cancel()
    expect(text).toContain('"authenticated":true')
  })
})
