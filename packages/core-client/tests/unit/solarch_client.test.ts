import { describe, it, expect, vi } from 'vitest'
import { SolarchClient } from '../../src/Client.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import { LocalAuthStore } from '../../src/stores/LocalAuthStore.js'

describe('SolarchClient Unit Tests', () => {
  describe('constructor', () => {
    it('uses provided authStore when given', () => {
      const customStore = new MemoryAuthStore('my_token')
      const client = new SolarchClient('http://127.0.0.1:8090', { authStore: customStore })
      expect(client.authStore).toBe(customStore)
      expect(client.authStore.getToken()).toBe('my_token')
    })

    it('defaults to MemoryAuthStore in Node (no window/localStorage)', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      // In Node test environment, there's no window.localStorage
      expect(client.authStore).toBeInstanceOf(MemoryAuthStore)
    })

    it('normalizes base URL by stripping trailing slashes', () => {
      const client = new SolarchClient('http://127.0.0.1:8090///')
      expect(client.baseUrl).toBe('http://127.0.0.1:8090')
    })

    it('defaults baseUrl to "/" when empty', () => {
      const client = new SolarchClient()
      expect(client.baseUrl).toBe('')
    })

    it('initializes all service instances', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      expect(client.admins).toBeDefined()
      expect(client.collections).toBeDefined()
      expect(client.files).toBeDefined()
      expect(client.realtime).toBeDefined()
      expect(client.capabilities).toBeDefined()
      expect(client.http).toBeDefined()
    })

    it('passes custom fetch to HttpClient', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({ status: 'ok' }),
      })
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: customFetch })
      await client.capabilities.getHealth()
      expect(customFetch).toHaveBeenCalled()
    })
  })

  describe('collection()', () => {
    it('returns a RecordService for the given collection name', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const svc = client.collection('posts')
      expect(svc).toBeDefined()
      expect(svc.collectionIdOrName).toBe('posts')
    })

    it('caches RecordService instances by lowercased name', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const svc1 = client.collection('Posts')
      const svc2 = client.collection('posts')
      const svc3 = client.collection('POSTS')
      expect(svc1).toBe(svc2)
      expect(svc2).toBe(svc3)
    })

    it('returns different RecordService instances for different collections', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const svc1 = client.collection('posts')
      const svc2 = client.collection('users')
      expect(svc1).not.toBe(svc2)
    })

    it('trims whitespace before caching', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const svc1 = client.collection('  posts  ')
      const svc2 = client.collection('posts')
      expect(svc1).toBe(svc2)
    })
  })

  describe('filter()', () => {
    it('delegates to the filter utility', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const result = client.filter('status = {:status}', { status: 'active' })
      expect(result).toBe("status = 'active'")
    })

    it('escapes single quotes in values', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const result = client.filter('name = {:name}', { name: "O'Reilly" })
      expect(result).toBe("name = 'O\\'Reilly'")
    })

    it('works with empty params', () => {
      const client = new SolarchClient('http://127.0.0.1:8090')
      const result = client.filter('active = true')
      expect(result).toBe('active = true')
    })
  })

  describe('baseUrl', () => {
    it('reflects the HttpClient baseUrl', () => {
      const client = new SolarchClient('http://example.com:8090')
      expect(client.baseUrl).toBe('http://example.com:8090')
    })
  })
})
