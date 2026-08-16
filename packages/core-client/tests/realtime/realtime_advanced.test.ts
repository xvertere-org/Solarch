import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RealtimeService } from '../../src/realtime/RealtimeService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import type { WebSocketLike } from '../../src/contracts/interfaces.js'

class MockWs implements WebSocketLike {
  static instances: MockWs[] = []
  url: string
  readyState: number = 0
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  sentMessages: string[] = []
  closeCalled: boolean = false

  constructor(url: string) {
    this.url = url
    MockWs.instances.push(this)
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = 3
    this.closeCalled = true
    if (this.onclose) this.onclose({ code: 1000, reason: 'Closed' })
  }

  triggerOpen() {
    this.readyState = 1
    if (this.onopen) this.onopen({})
  }

  triggerMessage(data: string) {
    if (this.onmessage) this.onmessage({ data })
  }

  triggerClose(code = 1006, reason = 'Abnormal') {
    this.readyState = 3
    if (this.onclose) this.onclose({ code, reason })
  }
}

describe('RealtimeService Advanced & Resilience Tests (Phase 3)', () => {
  let originalWs: any

  beforeEach(() => {
    vi.useFakeTimers()
    MockWs.instances = []
    originalWs = (globalThis as any).WebSocket
    ;(globalThis as any).WebSocket = MockWs
  })

  afterEach(() => {
    vi.useRealTimers()
    ;(globalThis as any).WebSocket = originalWs
    vi.restoreAllMocks()
  })

  it('generates proper WebSocket URL from HTTP and attaches token', async () => {
    const authStore = new MemoryAuthStore()
    authStore.save('test_jwt_123', { id: 'usr_1' })
    const http = new HttpClient({ baseUrl: 'http://example.com:8090', authStore })
    const realtime = new RealtimeService(http)

    const subPromise = realtime.subscribe('posts', () => {})
    const ws = MockWs.instances[0]!
    expect(ws.url).toBe('ws://example.com:8090/api/realtime?token=test_jwt_123')

    ws.triggerOpen()
    ws.triggerMessage(JSON.stringify({ type: 'connected', clientId: 'c1' }))
    await subPromise
    expect(ws.sentMessages).toContain(JSON.stringify({ type: 'subscribe', channels: ['posts'] }))
  })

  it('generates proper WSS URL from HTTPS baseUrl', async () => {
    const http = new HttpClient({ baseUrl: 'https://secure.solarch.in' })
    const realtime = new RealtimeService(http)

    const connectPromise = realtime.connect()
    const ws = MockWs.instances[0]!
    expect(ws.url).toBe('wss://secure.solarch.in/api/realtime')
    ws.triggerOpen()
    await connectPromise
  })

  it('handles multiple concurrent subscriptions and wildcard topic', async () => {
    const http = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
    const realtime = new RealtimeService(http)

    const postsCb = vi.fn()
    const usersCb = vi.fn()
    const wildcardCb = vi.fn()

    const p1 = realtime.subscribe('posts', postsCb)
    const ws = MockWs.instances[0]!
    ws.triggerOpen()
    await p1

    await realtime.subscribe('users', usersCb)
    await realtime.subscribe('*', wildcardCb)

    // Simulate connected handshake
    ws.triggerMessage(JSON.stringify({ type: 'connected', clientId: 'client_xyz' }))
    expect(realtime.getClientId()).toBe('client_xyz')

    // Event on posts
    ws.triggerMessage(JSON.stringify({
      type: 'event',
      channel: 'posts',
      data: { action: 'create', record: { id: 'post_1', title: 'Hello' } }
    }))

    expect(postsCb).toHaveBeenCalledTimes(1)
    expect(usersCb).not.toHaveBeenCalled()
    expect(wildcardCb).toHaveBeenCalledTimes(1)

    // Event on users
    ws.triggerMessage(JSON.stringify({
      type: 'event',
      channel: 'users',
      data: { action: 'update', record: { id: 'user_1', name: 'Alice' } }
    }))

    expect(postsCb).toHaveBeenCalledTimes(1)
    expect(usersCb).toHaveBeenCalledTimes(1)
    expect(wildcardCb).toHaveBeenCalledTimes(2)
  })

  it('BUG-8: Cleans up channelAliases on topic unsubscribe and full unsubscribe', async () => {
    const http = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
    const realtime = new RealtimeService(http)

    const cb1 = vi.fn()
    const unsubPromise = realtime.subscribe('posts', cb1)
    const ws = MockWs.instances[0]!
    ws.triggerOpen()
    const unsub = await unsubPromise

    // Simulate alias announcement from server
    ws.triggerMessage(JSON.stringify({
      type: 'subscribed',
      channels: ['collections.col_posts_123.records', 'posts']
    }))

    const aliasesMap = (realtime as any).channelAliases as Map<string, string>
    expect(aliasesMap.size).toBeGreaterThan(0)
    expect(aliasesMap.get('col_posts_123')).toBe('posts')

    // Unsubscribe single subscriber
    unsub()
    expect(aliasesMap.has('col_posts_123')).toBe(false)
    expect(aliasesMap.size).toBe(0)

    // Re-populate and test full unsubscribe()
    await realtime.subscribe('articles', () => {})
    ws.triggerMessage(JSON.stringify({
      type: 'subscribed',
      channels: ['collections.col_articles_456.records', 'articles']
    }))
    expect(aliasesMap.size).toBeGreaterThan(0)

    await realtime.unsubscribe()
    expect(aliasesMap.size).toBe(0)
  })

  it('automatically reconnects with backoff when connection drops', async () => {
    const http = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
    const realtime = new RealtimeService(http, {
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3
    })

    const p = realtime.subscribe('posts', () => {})
    const ws1 = MockWs.instances[0]!
    ws1.triggerOpen()
    await p

    // Drop connection
    ws1.triggerClose(1006, 'Abnormal Disconnection')
    expect(realtime.isConnected()).toBe(false)

    // Advance timer for 1st attempt: 1000ms * (1.5 ^ 0) = 1000ms
    vi.advanceTimersByTime(1000)
    expect(MockWs.instances).toHaveLength(2)

    const ws2 = MockWs.instances[1]!
    ws2.triggerOpen()
    ws2.triggerMessage(JSON.stringify({ type: 'connected', clientId: 'reconnected_client_1' }))

    // Confirms subscriptions were re-sent upon reconnecting
    expect(ws2.sentMessages).toContain(JSON.stringify({ type: 'subscribe', channels: ['posts'] }))
    expect(realtime.getClientId()).toBe('reconnected_client_1')
  })

  it('stops reconnecting after maxReconnectAttempts is reached', async () => {
    const http = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
    const realtime = new RealtimeService(http, {
      autoReconnect: true,
      reconnectInterval: 100,
      maxReconnectAttempts: 2
    })

    const p = realtime.subscribe('posts', () => {})
    const ws1 = MockWs.instances[0]!
    ws1.triggerOpen()
    await p

    // Drop connection 1
    ws1.triggerClose()

    // 1st reconnect attempt (delay = 100ms)
    await vi.advanceTimersByTimeAsync(150)
    expect(MockWs.instances).toHaveLength(2)
    MockWs.instances[1]!.triggerClose()

    // 2nd reconnect attempt (delay = 150ms)
    await vi.advanceTimersByTimeAsync(200)
    expect(MockWs.instances).toHaveLength(3)
    MockWs.instances[2]!.triggerClose()

    // 3rd reconnect attempt should NOT happen (max was 2)
    await vi.advanceTimersByTimeAsync(10000)
    expect(MockWs.instances).toHaveLength(3)
  })
})
