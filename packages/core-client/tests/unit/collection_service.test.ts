import { describe, it, expect, vi } from 'vitest'
import { CollectionService } from '../../src/services/CollectionService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import { ClientResponseError } from '../../src/contracts/errors.js'

function createMockHttpClient(mockResponse: any = {}) {
  const mockFetch = vi.fn().mockImplementation(async () => ({
    ok: true, status: 200, statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => mockResponse,
  }))
  const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', authStore: new MemoryAuthStore(), fetch: mockFetch })
  return { client, mockFetch }
}

describe('CollectionService Unit Tests', () => {
  describe('getList()', () => {
    it('sends GET to /api/collections with page/perPage', async () => {
      const listResult = { page: 1, perPage: 30, totalItems: 2, totalPages: 1, items: [{ id: 'col_1', name: 'posts' }] }
      const { client, mockFetch } = createMockHttpClient(listResult)
      const svc = new CollectionService(client)

      const result = await svc.getList()
      expect(result).toEqual(listResult)
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections')
      expect(url).toContain('page=1')
      expect(url).toContain('perPage=30')
    })

    it('forwards custom page and perPage', async () => {
      const { client, mockFetch } = createMockHttpClient({ page: 3, perPage: 5, totalItems: 0, totalPages: 0, items: [] })
      const svc = new CollectionService(client)
      await svc.getList(3, 5)
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('page=3')
      expect(url).toContain('perPage=5')
    })
  })

  describe('getOne()', () => {
    it('sends GET to /api/collections/:id', async () => {
      const col = { id: 'col_1', name: 'posts', type: 'base' }
      const { client, mockFetch } = createMockHttpClient(col)
      const svc = new CollectionService(client)

      const result = await svc.getOne('posts')
      expect(result).toEqual(col)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts')
      expect(init.method).toBe('GET')
    })

    it('encodes collection name for safety', async () => {
      const { client, mockFetch } = createMockHttpClient({ id: 'col_1' })
      const svc = new CollectionService(client)
      await svc.getOne('../secrets')
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('..%2Fsecrets')
    })
  })

  describe('create()', () => {
    it('sends POST to /api/collections with body', async () => {
      const created = { id: 'col_new', name: 'articles', type: 'base' }
      const { client, mockFetch } = createMockHttpClient(created)
      const svc = new CollectionService(client)

      const result = await svc.create({ name: 'articles', type: 'base' } as any)
      expect(result).toEqual(created)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections')
      expect(init.method).toBe('POST')
    })
  })

  describe('update()', () => {
    it('sends PATCH to /api/collections/:id with body', async () => {
      const updated = { id: 'col_1', name: 'articles_v2' }
      const { client, mockFetch } = createMockHttpClient(updated)
      const svc = new CollectionService(client)

      const result = await svc.update('col_1', { name: 'articles_v2' } as any)
      expect(result).toEqual(updated)
      const [, init] = mockFetch.mock.calls[0]!
      expect(init.method).toBe('PATCH')
    })
  })

  describe('delete()', () => {
    it('sends DELETE and returns true', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => ({
        ok: true, status: 204, statusText: 'No Content',
        headers: { get: () => '' },
        json: async () => null,
      }))
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new CollectionService(client)

      const result = await svc.delete('col_1')
      expect(result).toBe(true)
      const [, init] = mockFetch.mock.calls[0]!
      expect(init.method).toBe('DELETE')
    })
  })

  describe('import()', () => {
    it('sends POST to /api/collections/import with collections and deleteMissing', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new CollectionService(client)

      const result = await svc.import([{ name: 'a' }, { name: 'b' }] as any[], true)
      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/import')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.collections).toHaveLength(2)
      expect(body.deleteMissing).toBe(true)
    })

    it('defaults deleteMissing to false', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new CollectionService(client)
      await svc.import([{ name: 'a' }] as any[])
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.deleteMissing).toBe(false)
    })
  })
})
