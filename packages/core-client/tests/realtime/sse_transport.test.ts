import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SseTransportAdapter } from '../../src/realtime/SseTransportAdapter.js'

class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  readyState: number = 0 // 0: CONNECTING, 1: OPEN, 2: CLOSED
  onopen: ((event?: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((err: any) => void) | null = null
  closeCalled: boolean = false

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  close() {
    this.readyState = 2
    this.closeCalled = true
  }

  // Helper methods for tests to trigger events
  triggerOpen() {
    this.readyState = 1
    if (this.onopen) this.onopen({})
  }

  triggerMessage(data: string) {
    if (this.onmessage) this.onmessage({ data })
  }

  triggerError(err: any) {
    if (this.onerror) this.onerror(err)
  }
}

describe('BUG-5: SseTransportAdapter Unit Tests', () => {
  let originalEventSource: any

  beforeEach(() => {
    MockEventSource.instances = []
    originalEventSource = (globalThis as any).EventSource
    ;(globalThis as any).EventSource = MockEventSource
  })

  afterEach(() => {
    ;(globalThis as any).EventSource = originalEventSource
    vi.restoreAllMocks()
  })

  it('rejects connect() if EventSource is not supported in the runtime environment', async () => {
    delete (globalThis as any).EventSource
    const adapter = new SseTransportAdapter()

    await expect(adapter.connect('http://127.0.0.1:8090/api/realtime')).rejects.toThrow(
      'EventSource is not supported in this runtime environment.'
    )
  })

  it('connects successfully when EventSource opens', async () => {
    const adapter = new SseTransportAdapter()
    const openListener = vi.fn()
    adapter.onOpen(openListener)

    const connectPromise = adapter.connect('http://127.0.0.1:8090/api/realtime')

    expect(MockEventSource.instances).toHaveLength(1)
    const mockEs = MockEventSource.instances[0]!
    expect(mockEs.url).toBe('http://127.0.0.1:8090/api/realtime')

    mockEs.triggerOpen()
    await expect(connectPromise).resolves.toBeUndefined()
    expect(openListener).toHaveBeenCalledTimes(1)
    expect(adapter.isConnected()).toBe(true)
  })

  it('rejects connect() if EventSource errors before opening', async () => {
    const adapter = new SseTransportAdapter()
    const errorListener = vi.fn()
    adapter.onError(errorListener)

    const connectPromise = adapter.connect('http://127.0.0.1:8090/api/realtime')

    const mockEs = MockEventSource.instances[0]!
    const errorObj = new Error('Connection failed')
    mockEs.triggerError(errorObj)

    await expect(connectPromise).rejects.toThrow('Connection failed')
    expect(errorListener).toHaveBeenCalledWith(errorObj)
    expect(adapter.isConnected()).toBe(false)
  })

  it('dispatches incoming SSE messages to message listeners', async () => {
    const adapter = new SseTransportAdapter()
    const messageListener = vi.fn()
    adapter.onMessage(messageListener)

    const connectPromise = adapter.connect('http://127.0.0.1:8090/api/realtime')
    const mockEs = MockEventSource.instances[0]!
    mockEs.triggerOpen()
    await connectPromise

    mockEs.triggerMessage('{"type":"connected","clientId":"sse_123"}')
    expect(messageListener).toHaveBeenCalledWith('{"type":"connected","clientId":"sse_123"}')

    // Non-string data fallback
    if (mockEs.onmessage) {
      mockEs.onmessage({ data: null })
    }
    expect(messageListener).toHaveBeenCalledWith('')
  })

  it('disconnects and notifies close listeners with normal closure', async () => {
    const adapter = new SseTransportAdapter()
    const closeListener = vi.fn()
    adapter.onClose(closeListener)

    const connectPromise = adapter.connect('http://127.0.0.1:8090/api/realtime')
    const mockEs = MockEventSource.instances[0]!
    mockEs.triggerOpen()
    await connectPromise

    expect(adapter.isConnected()).toBe(true)

    adapter.disconnect()
    expect(mockEs.closeCalled).toBe(true)
    expect(adapter.isConnected()).toBe(false)
    expect(closeListener).toHaveBeenCalledWith(1000, 'Normal Closure')
  })

  it('send() throws error because SSE is unidirectional', () => {
    const adapter = new SseTransportAdapter()
    expect(() => adapter.send('hello')).toThrow(
      'SSE transport is unidirectional and does not support client-to-server messages.'
    )
  })

  it('handles constructor error in EventSource gracefully', async () => {
    ;(globalThis as any).EventSource = class ThrowingEventSource {
      constructor() {
        throw new Error('Invalid URL format')
      }
    }

    const adapter = new SseTransportAdapter()
    await expect(adapter.connect('invalid-url')).rejects.toThrow('Invalid URL format')
  })
})
