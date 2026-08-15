import { describe, it, expect } from 'vitest'
import { filter } from '../../src/utils/filter.js'
import { ClientResponseError, parseApiError } from '../../src/contracts/errors.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import { HttpClient } from '../../src/http/HttpClient.js'

describe('CORE-CLIENT-8: Security Verification Suite', () => {
  it('prevents filter injection attacks by escaping single quotes and backslashes', () => {
    const maliciousInput = "admin' OR '1'='1"
    const result = filter('email = {:email}', { email: maliciousInput })

    expect(result).toBe("email = 'admin\\' OR \\'1\\'=\\'1'")
  })

  it('escapes complex nested attack payloads with quotes and special characters', () => {
    const maliciousPayload = "\\'; DROP TABLE users; --"
    const result = filter('name = {:name}', { name: maliciousPayload })

    expect(result).toBe("name = '\\\\\\'; DROP TABLE users; --'")
  })


  it('safely handles malformed and non-JSON error envelopes without crashing', () => {
    const errHtml = parseApiError({ status: 502, statusText: 'Bad Gateway' }, '<html>502 Bad Gateway</html>')
    expect(errHtml).toBeInstanceOf(ClientResponseError)
    expect(errHtml.statusCode).toBe(502)
    expect(errHtml.isInternalError()).toBe(true)

    const errNull = parseApiError({ status: 500, statusText: 'Internal Error' }, null)
    expect(errNull.statusCode).toBe(500)
    expect(errNull.data).toEqual({})
  })

  it('isolates authentication token in memory and clears thoroughly', () => {
    const store = new MemoryAuthStore('secret_token', { id: 'usr_1', email: 'a@b.com' })
    expect(store.getToken()).toBe('secret_token')
    expect(store.isValid()).toBe(true)

    store.clear()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
    expect(store.isValid()).toBe(false)
  })

  it('ensures HttpClient injects Authorization header without exposing token in query params for REST calls', async () => {
    let capturedHeaders: Record<string, string> = {}
    let capturedUrl: string = ''

    const mockFetch = async (url: string, init?: any) => {
      capturedUrl = url
      capturedHeaders = init?.headers || {}
      return {
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 'rec_1' }),
      } as any
    }

    const authStore = new MemoryAuthStore('jwt_token_abc')
    const http = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      authStore,
      fetch: mockFetch,
    })

    await http.get('/api/collections/posts/records')
    expect(capturedUrl).toBe('http://127.0.0.1:8090/api/collections/posts/records')
    expect(capturedHeaders['Authorization']).toBe('Bearer jwt_token_abc')
    expect(capturedHeaders['X-Solarch-Protocol']).toBe('1.0')
    expect(capturedUrl.includes('jwt_token_abc')).toBe(false)
  })

  it('ensures token is not leaked into error messages, thrown serialized objects, or debug metadata', async () => {
    const sensitiveToken = 'sensitive_jwt_token_xyz_987'
    const mockFailingFetch = async (_url: string, _init?: any) => {
      return {
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => 'application/json' },
        json: async () => ({
          code: 401,
          status: 'UNAUTHORIZED',
          message: 'The request requires valid authentication credentials.',
          data: {},
        }),
      } as any
    }

    const authStore = new MemoryAuthStore(sensitiveToken)
    const http = new HttpClient({
      baseUrl: 'http://127.0.0.1:8090',
      authStore,
      fetch: mockFailingFetch,
    })

    try {
      await http.get('/api/collections/secrets/records')
      expect.unreachable('Should have thrown ClientResponseError')
    } catch (err: any) {
      expect(err).toBeInstanceOf(ClientResponseError)
      expect(err.message.includes(sensitiveToken)).toBe(false)
      expect(JSON.stringify(err).includes(sensitiveToken)).toBe(false)
      expect(err.statusCode).toBe(401)
      expect(err.isUnauthorized()).toBe(true)
    }
  })
})

