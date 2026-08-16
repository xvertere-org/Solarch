import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SolarchClient } from '../../src/Client.js'
import { CapabilityService } from '../../src/services/CapabilityService.js'
import { HttpClient } from '../../src/http/HttpClient.js'

describe('Phase 6: Load & Memory Stress Suite (BUG-7, BUG-9)', () => {
  describe('BUG-7: recordServices Map LRU & Bounded Memory', () => {
    it('bounds collection cache to 500 instances under 10,000 unique collection requests', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')

      // Access 10,000 distinct collections
      for (let i = 0; i < 10000; i++) {
        client.collection(`collection_${i}`)
      }

      const map = (client as any).recordServices as Map<string, any>
      // Must not exceed 500 entries
      expect(map.size).toBe(500)

      // Eviction check: collection_0 through collection_9499 should have been evicted
      expect(map.has('collection_0')).toBe(false)
      expect(map.has('collection_5000')).toBe(false)
      expect(map.has('collection_9500')).toBe(true)
      expect(map.has('collection_9999')).toBe(true)
    })

    it('clearCollectionCache() completely purges cached instances', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      client.collection('col_a')
      client.collection('col_b')

      const map = (client as any).recordServices as Map<string, any>
      expect(map.size).toBe(2)

      client.clearCollectionCache()
      expect(map.size).toBe(0)
    })
  })

  describe('BUG-9: CapabilityService Health Cache TTL', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('auto-refreshes cached health once TTL (30s default) expires', async () => {
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: async () => ({
            code: 200,
            status: callCount === 1 ? 'ok' : 'degraded',
            message: `Check #${callCount}`
          })
        }
      })

      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new CapabilityService(client, { cacheTtl: 30_000 })

      // Call 1: Fetches from network
      const h1 = await svc.getHealth()
      expect(h1.status).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Call 2 within 10s: Uses cache
      vi.advanceTimersByTime(10_000)
      const h2 = await svc.getHealth()
      expect(h2.status).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Call 3 after 31s total: TTL has expired, refreshes
      vi.advanceTimersByTime(21_000)
      const h3 = await svc.getHealth()
      expect(h3.status).toBe('degraded')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Realtime High-Frequency Message Ingestion', () => {
    it('dispatches 10,000 rapid realtime messages without dropped frames or leaks', async () => {
      const mockWs: any = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn()
      }
      const client = new SolarchClient('http://127.0.0.1:8090', {
        wsFactory: () => {
          setTimeout(() => {
            if (mockWs.onopen) mockWs.onopen({})
          }, 0)
          return mockWs
        }
      })
      const recSvc = client.collection('events')

      let eventCount = 0
      const unsub = await recSvc.subscribe(() => {
        eventCount++
      })

      const realtime = (client as any).realtime
      const handleIncomingMessage = (realtime as any).handleIncomingMessage.bind(realtime)

      // Dispatch 10,000 events
      for (let i = 0; i < 10000; i++) {
        handleIncomingMessage(JSON.stringify({
          type: 'event',
          channel: 'events',
          data: {
            action: 'create',
            record: { id: `event_${i}`, seq: i }
          }
        }))
      }

      expect(eventCount).toBe(10000)
      await unsub()
    })
  })
})
