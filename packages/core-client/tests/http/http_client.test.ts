import { describe, it, expect, vi } from 'vitest'
import { HttpClient } from '../../src/http/index.js'
import { MemoryAuthStore } from '../../src/stores/index.js'
import { ClientResponseError } from '../../src/contracts/index.js'

describe('HttpClient Unit Tests', () => {
  it('normalizes base URL and serializes query parameters accurately', () => {
    const client = new HttpClient({ baseUrl: 'https://example.com/api/' })
    const url = client.buildUrl('/records', {
      page: 2,
      perPage: 10,
      filter: 'active = true',
      tags: ['a', 'b'],
    })

    expect(url).toBe(
      'https://example.com/api/records?page=2&perPage=10&filter=active+%3D+true&tags=a&tags=b'
    )
  })

  it('injects Authorization header and X-Solarch-Protocol: 1.0', async () => {
    const authStore = new MemoryAuthStore('jwt_token_123')
    let capturedInit: any = null
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      capturedInit = init
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true }),
      }
    })

    const client = new HttpClient({
      baseUrl: 'https://example.com',
      authStore,
      fetch: mockFetch,
    })

    const data = await client.get('/test')
    expect(data).toEqual({ success: true })
    expect(capturedInit.headers['Authorization']).toBe('Bearer jwt_token_123')
    expect(capturedInit.headers['X-Solarch-Protocol']).toBe('1.0')
  })

  it('maps server error responses into ClientResponseError', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: () => 'application/json' },
      json: async () => ({
        code: 400,
        status: 'VALIDATION_FAILED',
        message: 'Invalid title',
        data: { fieldErrors: { title: { code: 'REQUIRED', message: 'Title is required' } } },
      }),
    }))

    const client = new HttpClient({
      baseUrl: 'https://example.com',
      fetch: mockFetch,
    })

    try {
      await client.post('/records', { body: {} })
      expect.unreachable('Should have thrown ClientResponseError')
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.statusCode).toBe(400)
      expect(err.status).toBe('VALIDATION_FAILED')
      expect(err.isValidationFailed()).toBe(true)
      expect(err.getFieldErrors()).toEqual({
        title: { code: 'REQUIRED', message: 'Title is required' },
      })
    }
  })
})
