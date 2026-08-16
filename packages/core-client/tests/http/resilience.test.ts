import { describe, it, expect, vi, afterEach } from 'vitest'
import { HttpClient } from '../../src/http/HttpClient.js'
import { ClientResponseError } from '../../src/contracts/errors.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'

/**
 * BUG-1: Request timeout and retry with exponential backoff
 * BUG-6: 429 rate-limit retry with Retry-After header
 */

function successResponse(data: any = {}) {
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => data,
  }
}

function errorResponse(status: number, body: any = {}, headers: Record<string, string> = {}) {
  return {
    ok: false, status, statusText: `Error ${status}`,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return 'application/json'
        return headers[name.toLowerCase()] || null
      },
    },
    json: async () => body,
  }
}

describe('BUG-1: Request Timeout', () => {
  afterEach(() => vi.restoreAllMocks())

  it('defaults timeout to 30000ms', () => {
    const client = new HttpClient({ fetch: vi.fn() })
    expect(client.timeout).toBe(30_000)
  })

  it('allows custom timeout via constructor', () => {
    const client = new HttpClient({ fetch: vi.fn(), timeout: 5000 })
    expect(client.timeout).toBe(5000)
  })

  it('allows disabling timeout by setting to 0', () => {
    const client = new HttpClient({ fetch: vi.fn(), timeout: 0 })
    expect(client.timeout).toBe(0)
  })

  it('aborts request after timeout expires', async () => {
    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      // Simulate a request that hangs — wait for abort
      return new Promise((_resolve, reject) => {
        if (init.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      timeout: 50, // Very short timeout for test
      maxRetries: 0,
    })

    try {
      await client.get('/api/test')
      expect.unreachable('Should have thrown')
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.isAbort).toBe(false)
      expect(err.statusCode).toBe(0)
      expect(err.message).toContain('timed out')
    }
  })

  it('allows per-request timeout override', async () => {
    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      return new Promise((_resolve, reject) => {
        if (init.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('Aborted')
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      timeout: 60_000, // long client timeout
      maxRetries: 0,
    })

    try {
      await client.get('/api/test', { timeout: 50 }) // short per-request
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.isAbort).toBe(false)
      expect(err.statusCode).toBe(0)
      expect(err.message).toContain('timed out')
    }
  })

  it('clears timeout when request completes successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue(successResponse({ ok: true }))
    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      timeout: 100,
      maxRetries: 0,
    })

    const result = await client.get('/api/test')
    expect(result).toEqual({ ok: true })
  })
})

describe('BUG-1: Retry with Exponential Backoff', () => {
  afterEach(() => vi.restoreAllMocks())

  it('defaults maxRetries to 3', () => {
    const client = new HttpClient({ fetch: vi.fn() })
    expect(client.maxRetries).toBe(3)
  })

  it('retries on network errors up to maxRetries', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(successResponse({ recovered: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    // Mock sleep to speed up test
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const result = await client.get('/api/test')
    expect(result).toEqual({ recovered: true })
    expect(mockFetch).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('throws after exhausting all retries on network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network unreachable'))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 2,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    try {
      await client.get('/api/test')
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.statusCode).toBe(0)
      expect(err.message).toContain('Network unreachable')
    }

    expect(mockFetch).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('retries on 500 server errors', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(500, { status: 'INTERNAL_ERROR', message: 'Server crash' }))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const result = await client.get('/api/test')
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 502, 503, 504 gateway errors', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(502, {}))
      .mockResolvedValueOnce(errorResponse(503, {}))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const result = await client.get('/api/test')
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('does NOT retry on 400 client errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      errorResponse(400, { status: 'VALIDATION_FAILED', message: 'Bad input' })
    )

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    try {
      await client.get('/api/test')
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.statusCode).toBe(400)
    }

    expect(mockFetch).toHaveBeenCalledTimes(1) // No retries
  })

  it('does NOT retry on 401, 403, 404', async () => {
    for (const status of [401, 403, 404]) {
      const mockFetch = vi.fn().mockResolvedValue(errorResponse(status, {}))
      const client = new HttpClient({
        baseUrl: 'http://127.0.0.1:8090',
        fetch: mockFetch,
        maxRetries: 3,
        timeout: 0,
      })

      try {
        await client.get('/api/test')
        expect.unreachable()
      } catch {
        // Expected
      }

      expect(mockFetch).toHaveBeenCalledTimes(1)
    }
  })

  it('does NOT retry on user-initiated AbortError', async () => {
    const abortErr = new Error('Aborted by user')
    abortErr.name = 'AbortError'
    const mockFetch = vi.fn().mockRejectedValue(abortErr)

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    try {
      await client.get('/api/test')
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.isAbort).toBe(true)
    }

    expect(mockFetch).toHaveBeenCalledTimes(1) // No retries
  })

  it('disables retries when maxRetries=0', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 0,
      timeout: 0,
    })

    try {
      await client.get('/api/test')
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
    }

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('allows per-request maxRetries override', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 5,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    try {
      await client.get('/api/test', { maxRetries: 1 })
      expect.unreachable()
    } catch {
      // Expected
    }

    expect(mockFetch).toHaveBeenCalledTimes(2) // 1 initial + 1 retry
  })

  it('uses exponential backoff delays (200ms, 400ms, 800ms)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fail'))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    const sleepSpy = vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    try {
      await client.get('/api/test')
    } catch { /* expected */ }

    expect(sleepSpy).toHaveBeenCalledTimes(3) // 3 retries, 3 sleeps
    const call1 = sleepSpy.mock.calls[0]![0]
    const call2 = sleepSpy.mock.calls[1]![0]
    const call3 = sleepSpy.mock.calls[2]![0]
    expect(call1).toBeGreaterThanOrEqual(200)
    expect(call1).toBeLessThanOrEqual(300)
    expect(call2).toBeGreaterThanOrEqual(400)
    expect(call2).toBeLessThanOrEqual(600)
    expect(call3).toBeGreaterThanOrEqual(800)
    expect(call3).toBeLessThanOrEqual(1200)
  })
})

describe('BUG-6: 429 Rate Limit with Retry-After', () => {
  afterEach(() => vi.restoreAllMocks())

  it('retries on 429 responses', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(429, { status: 'RATE_LIMITED', message: 'Too many requests' }))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const result = await client.get('/api/test')
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('respects Retry-After header value (in seconds)', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(
        429,
        { status: 'RATE_LIMITED' },
        { 'retry-after': '5' }
      ))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    const sleepSpy = vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    await client.get('/api/test')

    // Should use Retry-After value: 5 seconds = 5000ms
    expect(sleepSpy).toHaveBeenCalledWith(5000)
  })

  it('caps Retry-After at 60 seconds to prevent abuse', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(
        429,
        { status: 'RATE_LIMITED' },
        { 'retry-after': '600' } // 10 minutes — should be capped
      ))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    const sleepSpy = vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    await client.get('/api/test')

    expect(sleepSpy).toHaveBeenCalledWith(60_000) // Capped at 60s
  })

  it('falls back to exponential backoff when Retry-After is not present on 429', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(errorResponse(429, { status: 'RATE_LIMITED' }))
      .mockResolvedValueOnce(successResponse({ ok: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    const sleepSpy = vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    await client.get('/api/test')

    // First retry delay has base 200ms with jitter [200, 300]
    const delay = sleepSpy.mock.calls[0]![0]
    expect(delay).toBeGreaterThanOrEqual(200)
    expect(delay).toBeLessThanOrEqual(300)
  })

  it('throws after exhausting retries on persistent 429', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      errorResponse(429, { status: 'RATE_LIMITED', message: 'Rate limited' })
    )

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 2,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    try {
      await client.get('/api/test')
      expect.unreachable()
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.isRateLimited()).toBe(true)
      expect(err.statusCode).toBe(429)
    }

    expect(mockFetch).toHaveBeenCalledTimes(3) // 1 + 2 retries
  })
})

describe('BUG-12: Missing fetch throws ClientResponseError', () => {
  it('throws ClientResponseError (not plain Error) when no fetch is available', () => {
    const originalFetch = globalThis.fetch
    try {
      // @ts-ignore
      delete globalThis.fetch
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
      expect(() => (client as any).getFetch()).toThrow(ClientResponseError)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('FIX 1: Timeout vs User Abort Classification & Timeout Retry', () => {
  it('retries on request timeout and resolves when subsequent attempt succeeds', async () => {
    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      callCount++
      if (callCount === 1) {
        // First attempt: simulate timeout by waiting for signal abort
        return new Promise((_resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      }
      // Second attempt: succeeds
      return successResponse({ recovered: true })
    })

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      timeout: 20, // 20ms short timeout
      maxRetries: 2,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const res = await client.get<{ recovered: boolean }>('/api/fast')
    expect(res.recovered).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('immediately throws on genuine user abort without retrying', async () => {
    const userController = new AbortController()
    const mockFetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      return new Promise((_resolve, reject) => {
        if (init.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      timeout: 1000,
      maxRetries: 3,
    })

    const requestPromise = client.get('/api/user-aborted', { signal: userController.signal })
    // Trigger user abort
    userController.abort()

    await expect(requestPromise).rejects.toMatchObject({
      isAbort: true,
    })
    // User abort must not retry — called exactly once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('FIX 2: Method-Aware Idempotent Retries & retryUnsafeMethods', () => {
  it('does NOT retry failed POST requests by default (throws on attempt 1)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection reset'))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })

    await expect(client.post('/api/records', { body: { title: 'No duplicate' } })).rejects.toThrow(
      ClientResponseError
    )

    // Only 1 attempt for non-idempotent POST by default
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries failed POST requests when retryUnsafeMethods is explicitly true', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network glitch'))
      .mockResolvedValueOnce(successResponse({ created: true }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const res = await client.post<{ created: boolean }>('/api/records', {
      body: { title: 'Safe duplicate' },
      retryUnsafeMethods: true,
    })

    expect(res.created).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('continues to retry GET requests by default', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(successResponse({ data: 'ok' }))

    const client = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      fetch: mockFetch,
      maxRetries: 3,
      timeout: 0,
    })
    vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined)

    const res = await client.get('/api/idempotent')
    expect(res).toEqual({ data: 'ok' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('FIX 3: Retry Backoff Jitter', () => {
  it('adds jitter within [exponential, 1.5 * exponential] for backoff calculations', () => {
    const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090' })
    const dummyErr = new ClientResponseError({ statusCode: 500 })

    for (let attempt = 1; attempt <= 4; attempt++) {
      const baseExponential = 200 * Math.pow(2, attempt - 1)
      const maxWithJitter = baseExponential * 1.5

      for (let run = 0; run < 20; run++) {
        const delay = client.calculateRetryDelay(attempt, dummyErr)
        expect(delay).toBeGreaterThanOrEqual(baseExponential)
        expect(delay).toBeLessThanOrEqual(maxWithJitter)
      }
    }
  })
})
