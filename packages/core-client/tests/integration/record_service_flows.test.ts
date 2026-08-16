import { describe, it, expect, vi } from 'vitest'
import { SolarchClient } from '../../src/Client.js'

function listResponse(page: number, perPage: number, totalItems: number, items: any[]) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: (h: string) => h.toLowerCase() === 'content-type' ? 'application/json' : null
    },
    json: async () => ({
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      items
    })
  }
}

describe('Phase 4: RecordService Multi-Page & BUG-2 Safety Cap Suite', () => {
  it('BUG-2: enforces maxItems safety cap to prevent OOM when collection exceeds limit', async () => {
    // Generate pages of 10 items each
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('perPage') || '10', 10)
      const totalItems = 50000 // Huge collection

      const items = Array.from({ length: perPage }, (_, i) => ({
        id: `rec_p${page}_${i}`,
        title: `Item ${(page - 1) * perPage + i}`
      }))

      return Promise.resolve(listResponse(page, perPage, totalItems, items))
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

    // Test with custom maxItems = 25 (batchSize = 10 -> will fetch page 1, 2, 3 and cap at 25)
    const records = await client.collection('big_data').getFullList({
      batchSize: 10,
      maxItems: 25
    })

    expect(records).toHaveLength(25)
    expect(records[0]?.id).toBe('rec_p1_0')
    expect(records[24]?.id).toBe('rec_p3_4')
    // Fetched page 1, 2, and 3 only (3 network calls)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('defaults maxItems to 10,000 when not explicitly set', async () => {
    let pagesFetched = 0
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      pagesFetched++
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      const perPage = parseInt(urlObj.searchParams.get('perPage') || '500', 10)

      const items = Array.from({ length: perPage }, (_, i) => ({
        id: `rec_${(page - 1) * perPage + i}`
      }))

      return Promise.resolve(listResponse(page, perPage, 100000, items))
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

    const records = await client.collection('huge_collection').getFullList({
      batchSize: 500
      // maxItems not set -> defaults to 10,000
    })

    expect(records).toHaveLength(10000)
    // 10000 / 500 = 20 pages fetched
    expect(pagesFetched).toBe(20)
  })

  it('correctly stops on last page when items count is less than batchSize', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const urlObj = new URL(url)
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10)
      if (page === 1) {
        return Promise.resolve(listResponse(1, 10, 15, Array.from({ length: 10 }, (_, i) => ({ id: `p1_${i}` }))))
      } else {
        return Promise.resolve(listResponse(2, 10, 15, Array.from({ length: 5 }, (_, i) => ({ id: `p2_${i}` }))))
      }
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })
    const records = await client.collection('items').getFullList({ batchSize: 10 })

    expect(records).toHaveLength(15)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops immediately if collection is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue(listResponse(1, 100, 0, []))
    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

    const records = await client.collection('empty_collection').getFullList()
    expect(records).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('forwards filter, sort, expand, and fields to getFullList query parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue(listResponse(1, 100, 1, [{ id: 'rec_1' }]))
    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

    await client.collection('posts').getFullList({
      filter: 'active = true',
      sort: '-created',
      expand: 'author,comments',
      fields: 'id,title,expand.author.name'
    })

    const [url] = mockFetch.mock.calls[0]!
    expect(url).toContain('filter=active+%3D+true')
    expect(url).toContain('sort=-created')
    expect(url).toContain('expand=author%2Ccomments')
    expect(url).toContain('fields=id%2Ctitle%2Cexpand.author.name')
  })
})
