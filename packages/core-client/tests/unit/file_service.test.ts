import { describe, it, expect, vi } from 'vitest'
import { FileService } from '../../src/services/FileService.js'
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

describe('FileService Unit Tests', () => {
  describe('getUrl()', () => {
    it('constructs correct file URL with collection, record id, and filename', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl({ id: 'rec_1', collectionName: 'profiles' }, 'avatar.png')
      expect(url).toBe('http://127.0.0.1:8090/api/files/profiles/rec_1/avatar.png')
    })

    it('includes thumb and download query options', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl(
        { id: 'rec_1', collectionName: 'profiles' },
        'avatar.png',
        { thumb: '100x100', download: true } as any
      )
      expect(url).toContain('thumb=100x100')
      expect(url).toContain('download=true')
    })

    it('returns empty string when filename is empty', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl({ id: 'rec_1', collectionName: 'profiles' }, '')
      expect(url).toBe('')
    })

    it('throws when record is missing id or collection info', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      expect(() => svc.getUrl({ id: '', collectionName: 'profiles' } as any, 'file.txt'))
        .toThrow('Unable to construct file URL')
      expect(() => svc.getUrl({ id: 'rec_1' } as any, 'file.txt'))
        .toThrow('Unable to construct file URL')
    })

    it('uses collectionId if collectionName is not present', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl({ id: 'rec_1', collectionId: 'col_abc' } as any, 'doc.pdf')
      expect(url).toContain('/api/files/col_abc/rec_1/doc.pdf')
    })

    it('encodes special characters in filename and collection', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl({ id: 'rec_1', collectionName: 'my files' }, 'résumé (1).pdf')
      expect(url).toContain('my%20files')
      expect(url).toContain('r%C3%A9sum%C3%A9%20(1).pdf')
    })

    it('uses @collectionId fallback field', () => {
      const { client } = createMockHttpClient()
      const svc = new FileService(client)
      const url = svc.getUrl({ id: 'rec_1', '@collectionId': 'legacy_col' } as any, 'file.txt')
      expect(url).toContain('/api/files/legacy_col/rec_1/file.txt')
    })
  })

  describe('getToken()', () => {
    it('sends POST to /api/files/token and returns the token string', async () => {
      const { client, mockFetch } = createMockHttpClient({ token: 'file_access_token_xyz' })
      const svc = new FileService(client)

      const token = await svc.getToken('profiles', 'rec_1', 'avatar.png')

      expect(token).toBe('file_access_token_xyz')
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/files/token')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body).toEqual({ collection: 'profiles', recordId: 'rec_1', filename: 'avatar.png' })
    })

    it('returns empty string when server response has no token', async () => {
      const { client } = createMockHttpClient({})
      const svc = new FileService(client)
      const token = await svc.getToken('profiles', 'rec_1', 'file.txt')
      expect(token).toBe('')
    })
  })
})
