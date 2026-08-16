import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketTransportAdapter } from '../../src/realtime/WebSocketTransportAdapter.js'
import type { WebSocketLike } from '../../src/contracts/interfaces.js'

class MockWebSocket implements WebSocketLike {
  static instances: MockWebSocket[] = []
  url: string
  readyState: number = 0 // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  sentMessages: string[] = []
  closeCalled: boolean = false

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string): void {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open')
    }
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = 3
    this.closeCalled = true
  }

  triggerOpen() {
    this.readyState = 1
    if (this.onopen) this.onopen({})
  }

  triggerMessage(data: any) {
    if (this.onmessage) this.onmessage({ data })
  }

  triggerError(err: any) {
    if (this.onerror) this.onerror(err)
  }

  triggerClose(code = 1000, reason = 'Normal Closure') {
    this.readyState = 3
    if (this.onclose) this.onclose({ code, reason })
  }
}

describe('WebSocketTransportAdapter Unit Tests', () => {
  let originalWebSocket: any

  beforeEach(() => {
    MockWebSocket.instances = []
    originalWebSocket = (globalThis as any).WebSocket
    ;(globalThis as any).WebSocket = MockWebSocket
  })

  afterEach(() => {
    ;(globalThis as any).WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  it('uses custom wsFactory when provided', async () => {
    const customFactory = vi.fn().mockImplementation((url: string) => new MockWebSocket(url))
    const adapter = new WebSocketTransportAdapter(customFactory)

    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    expect(customFactory).toHaveBeenCalledWith('ws://127.0.0.1:8090/api/realtime')

    const mockWs = MockWebSocket.instances[0]!
    mockWs.triggerOpen()
    await connectPromise

    expect(adapter.isConnected()).toBe(true)
  })

  it('throws error when no global WebSocket and no wsFactory provided', async () => {
    delete (globalThis as any).WebSocket
    const adapter = new WebSocketTransportAdapter()

    await expect(adapter.connect('ws://127.0.0.1:8090/api/realtime')).rejects.toThrow(
      'No global WebSocket found. Please provide a custom WebSocketFactory in options.'
    )
  })

  it('handles connect failure and emits error listener', async () => {
    const adapter = new WebSocketTransportAdapter()
    const errorListener = vi.fn()
    adapter.onError(errorListener)

    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    const mockWs = MockWebSocket.instances[0]!
    const err = new Error('Socket failure')
    mockWs.triggerError(err)

    await expect(connectPromise).rejects.toThrow('Socket failure')
    expect(errorListener).toHaveBeenCalledWith(err)
  })

  it('sends data when connected, throws when not connected', async () => {
    const adapter = new WebSocketTransportAdapter()
    expect(() => adapter.send('test')).toThrow('WebSocket transport is not connected.')

    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    const mockWs = MockWebSocket.instances[0]!
    mockWs.triggerOpen()
    await connectPromise

    adapter.send('ping')
    expect(mockWs.sentMessages).toEqual(['ping'])
  })

  it('dispatches messages, handles Buffer/object data conversion', async () => {
    const adapter = new WebSocketTransportAdapter()
    const msgListener = vi.fn()
    adapter.onMessage(msgListener)

    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    const mockWs = MockWebSocket.instances[0]!
    mockWs.triggerOpen()
    await connectPromise

    mockWs.triggerMessage('string-msg')
    expect(msgListener).toHaveBeenCalledWith('string-msg')

    mockWs.triggerMessage({ toString: () => 'buffered-msg' })
    expect(msgListener).toHaveBeenCalledWith('buffered-msg')
  })

  it('handles onclose with code and reason', async () => {
    const adapter = new WebSocketTransportAdapter()
    const closeListener = vi.fn()
    adapter.onClose(closeListener)

    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    const mockWs = MockWebSocket.instances[0]!
    mockWs.triggerOpen()
    await connectPromise

    mockWs.triggerClose(4001, 'Unauthorized')
    expect(closeListener).toHaveBeenCalledWith(4001, 'Unauthorized')
  })

  it('disconnects cleanly', async () => {
    const adapter = new WebSocketTransportAdapter()
    const connectPromise = adapter.connect('ws://127.0.0.1:8090/api/realtime')
    const mockWs = MockWebSocket.instances[0]!
    mockWs.triggerOpen()
    await connectPromise

    adapter.disconnect()
    expect(mockWs.closeCalled).toBe(true)
    expect(adapter.isConnected()).toBe(false)
  })
})
