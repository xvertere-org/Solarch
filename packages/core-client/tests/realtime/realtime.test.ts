import { describe, it, expect, beforeEach } from 'vitest'
import { RealtimeService } from '../../src/realtime/RealtimeService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import type { WebSocketFactory, WebSocketLike } from '../../src/contracts/interfaces.js'

class MockWebSocket implements WebSocketLike {
  public url: string
  public readyState: number = 1 // OPEN immediately
  public sentMessages: string[] = []
  private listeners: Record<string, Function[]> = {}

  public onopen: ((event: any) => void) | null = null
  public onmessage: ((event: any) => void) | null = null
  public onclose: ((event: any) => void) | null = null
  public onerror: ((event: any) => void) | null = null

  constructor(url: string) {
    this.url = url
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = 3 // CLOSED
    this.emit('close', { code: 1000, reason: 'Normal Closure' })
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(listener)
  }

  removeEventListener(event: string, listener: Function): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener)
    }
  }

  emit(event: string, data: any): void {
    if (event === 'open' && this.onopen) this.onopen(data)
    if (event === 'message' && this.onmessage) this.onmessage(data)
    if (event === 'close' && this.onclose) this.onclose(data)
    if (event === 'error' && this.onerror) this.onerror(data)

    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        listener(data)
      }
    }
  }
}

describe('RealtimeService Feature Suite (@solarch/core-client)', () => {
  let authStore: MemoryAuthStore
  let httpClient: HttpClient
  let lastSocket: MockWebSocket | null = null

  const mockWsFactory: WebSocketFactory = (url: string) => {
    lastSocket = new MockWebSocket(url)
    // Auto-resolve open
    setTimeout(() => {
      lastSocket?.emit('open', {})
    }, 0)
    return lastSocket
  }

  beforeEach(() => {
    authStore = new MemoryAuthStore()
    httpClient = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', authStore })
    lastSocket = null
  })

  it('1. Connection & Protocol Handshake: connects and stores clientId from server handshake', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    await realtime.connect()

    lastSocket?.emit('message', {
      data: JSON.stringify({ type: 'connected', clientId: 'mock_client_123' })
    })

    expect(realtime.isConnected()).toBe(true)
    expect(realtime.getClientId()).toBe('mock_client_123')
  })

  it('2. Auth Header / Query Parameter: attaches auth token from AuthStore into realtime URL', async () => {
    authStore.save('mock_jwt_token_xyz', { id: 'usr_1', email: 'test@example.com' } as any)
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    await realtime.connect()

    expect(lastSocket?.url).toContain('token=mock_jwt_token_xyz')
  })

  it('3. Topic Subscriptions & Minimal Mutation Payload: receives and parses minimal mutation event', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    const receivedEvents: any[] = []

    const subPromise = realtime.subscribe('posts', (event) => {
      receivedEvents.push(event)
    })

    await subPromise

    // Simulate server broadcasting minimal mutation event
    lastSocket?.emit('message', {
      data: JSON.stringify({
        type: 'event',
        channel: 'posts',
        data: {
          action: 'create',
          collectionId: 'posts',
          data: { id: 'rec_abc123' },
          timestamp: '2026-08-15T12:00:00.000Z'
        }
      })
    })

    expect(receivedEvents.length).toBe(1)
    expect(receivedEvents[0].action).toBe('create')
    expect(receivedEvents[0].data.id).toBe('rec_abc123')
    expect(receivedEvents[0].timestamp).toBe('2026-08-15T12:00:00.000Z')
  })

  it('4. Malformed Event Rejection: safely handles non-JSON and malformed frames without throwing', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    let callCount = 0

    const subPromise = realtime.subscribe('posts', () => {
      callCount++
    })
    await subPromise

    // Send malformed frames
    lastSocket?.emit('message', { data: 'invalid json {' })
    lastSocket?.emit('message', { data: '' })
    lastSocket?.emit('message', { data: '123' })

    expect(callCount).toBe(0)
    expect(realtime.isConnected()).toBe(true)
  })

  it('5. Heartbeat & Ping/Pong: automatically replies to server ping with pong frame', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    await realtime.connect()

    lastSocket?.emit('message', {
      data: JSON.stringify({ type: 'ping', timestamp: Date.now() })
    })

    const pongMsg = lastSocket?.sentMessages.find(m => m.includes('"type":"pong"'))
    expect(pongMsg).toBeDefined()
  })

  it('6. Subscription Recovery: recovers active subscriptions upon handshake on new connection', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    await realtime.subscribe('posts', () => {})

    // Simulate new connection established
    await realtime.connect()
    lastSocket?.emit('message', {
      data: JSON.stringify({ type: 'connected', clientId: 'mock_client_456' })
    })

    const subscribeMsg = lastSocket?.sentMessages.find(m => m.includes('"type":"subscribe"') && m.includes('posts'))
    expect(subscribeMsg).toBeDefined()
  })

  it('7. Unsubscribe: removes subscriber and sends unsubscribe frame when topic has zero subscribers', async () => {
    const realtime = new RealtimeService(httpClient, { wsFactory: mockWsFactory, autoReconnect: false })
    const unsub = await realtime.subscribe('posts', () => {})

    unsub()

    const unsubMsg = lastSocket?.sentMessages.find(m => m.includes('"type":"unsubscribe"') && m.includes('posts'))
    expect(unsubMsg).toBeDefined()
  })
})
