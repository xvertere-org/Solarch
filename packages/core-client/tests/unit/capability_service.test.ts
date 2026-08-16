import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CapabilityService } from '../../src/services/CapabilityService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'

function createMockHttpClient(mockResponse: any = {}) {
  const mockFetch = vi.fn().mockImplementation(async () => ({
    ok: true, status: 200, statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => mockResponse,
  }))
  const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', authStore: new MemoryAuthStore(), fetch: mockFetch })
  return { client, mockFetch }
}

describe('CapabilityService Unit Tests', () => {
  describe('getHealth()', () => {
    it('sends GET to /api/health and returns server health info', async () => {
      const healthData = { code: 200, message: 'Healthy', status: 'ok', data: { dbConnected: true } }
      const { client, mockFetch } = createMockHttpClient(healthData)
      const svc = new CapabilityService(client)

      const result = await svc.getHealth()
      expect(result).toEqual(healthData)
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/health')
    })

    it('caches the result on first call and does not re-fetch', async () => {
      const healthData = { code: 200, message: 'Healthy', status: 'ok' }
      const { client, mockFetch } = createMockHttpClient(healthData)
      const svc = new CapabilityService(client)

      await svc.getHealth()
      await svc.getHealth()
      await svc.getHealth()

      expect(mockFetch).toHaveBeenCalledTimes(1) // Only one network call
    })

    it('re-fetches after clearCache() is called', async () => {
      const { client, mockFetch } = createMockHttpClient({ code: 200, status: 'ok' })
      const svc = new CapabilityService(client)

      await svc.getHealth()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      svc.clearCache()
      await svc.getHealth()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('isHealthy()', () => {
    it('returns true when status is "ok"', async () => {
      const { client } = createMockHttpClient({ status: 'ok' })
      const svc = new CapabilityService(client)
      expect(await svc.isHealthy()).toBe(true)
    })

    it('returns true when code is 200', async () => {
      const { client } = createMockHttpClient({ code: 200 })
      const svc = new CapabilityService(client)
      expect(await svc.isHealthy()).toBe(true)
    })

    it('returns true when message is "Healthy" (case-insensitive)', async () => {
      const { client } = createMockHttpClient({ message: 'HEALTHY' })
      const svc = new CapabilityService(client)
      expect(await svc.isHealthy()).toBe(true)
    })

    it('returns false when server returns non-healthy response', async () => {
      const { client } = createMockHttpClient({ status: 'degraded', code: 503 })
      const svc = new CapabilityService(client)
      expect(await svc.isHealthy()).toBe(false)
    })

    it('returns false when network fails (catches error)', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network down'))
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch, maxRetries: 0 })
      const svc = new CapabilityService(client)
      expect(await svc.isHealthy()).toBe(false)
    })
  })

  describe('get()', () => {
    it('is an alias for getHealth', async () => {
      const healthData = { code: 200, status: 'ok' }
      const { client } = createMockHttpClient(healthData)
      const svc = new CapabilityService(client)

      const r1 = await svc.get()
      const r2 = await svc.getHealth()
      expect(r1).toEqual(r2)
    })
  })

  describe('clearCache()', () => {
    it('resets cached health so next call re-fetches', async () => {
      const { client, mockFetch } = createMockHttpClient({ status: 'ok' })
      const svc = new CapabilityService(client)

      await svc.getHealth()
      svc.clearCache()
      await svc.getHealth()

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
