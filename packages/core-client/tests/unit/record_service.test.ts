import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecordService } from '../../src/services/RecordService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'
import { ClientResponseError } from '../../src/contracts/errors.js'

/**
 * BUG-4: RecordService unit tests — all 18 public methods.
 *
 * Pattern: inject a mock fetch into HttpClient so we capture the exact
 * URL, method, headers, and body that RecordService produces, then assert
 * against them. No live server needed.
 */

function createMockHttpClient(mockResponse: any = {}) {
  const mockFetch = vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => mockResponse,
  }))

  const authStore = new MemoryAuthStore()
  const client = new HttpClient({
    baseUrl: 'http://127.0.0.1:8090',
    authStore,
    fetch: mockFetch,
  })

  return { client, mockFetch, authStore }
}

function createMockRealtimeProvider() {
  return {
    subscribe: vi.fn().mockResolvedValue(() => {}),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  }
}

describe('RecordService Unit Tests (BUG-4)', () => {
  // ─── CRUD Methods ───────────────────────────────────────────

  describe('getList()', () => {
    it('sends GET with correct page/perPage query params and returns ListResult', async () => {
      const listResult = { page: 2, perPage: 10, totalItems: 50, totalPages: 5, items: [{ id: 'rec_1' }] }
      const { client, mockFetch } = createMockHttpClient(listResult)
      const svc = new RecordService(client, 'posts')

      const result = await svc.getList(2, 10)

      expect(result).toEqual(listResult)
      expect(mockFetch).toHaveBeenCalledOnce()
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts/records')
      expect(url).toContain('page=2')
      expect(url).toContain('perPage=10')
    })

    it('uses default page=1, perPage=30 when no args', async () => {
      const { client, mockFetch } = createMockHttpClient({ page: 1, perPage: 30, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, 'posts')

      await svc.getList()

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('page=1')
      expect(url).toContain('perPage=30')
    })

    it('passes filter and sort options through query params', async () => {
      const { client, mockFetch } = createMockHttpClient({ page: 1, perPage: 10, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, 'posts')

      await svc.getList(1, 10, { filter: 'active=true', sort: '-created' })

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('filter=active%3Dtrue')
      expect(url).toContain('sort=-created')
    })

    it('encodeURIComponent is used on collection name for path traversal safety', async () => {
      const { client, mockFetch } = createMockHttpClient({ page: 1, perPage: 30, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, '../admin')

      await svc.getList()

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/..%2Fadmin/records')
      expect(url).not.toContain('/../admin/')
    })
  })

  describe('getFullList()', () => {
    it('fetches all pages and concatenates items', async () => {
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++
        const items = callCount === 1
          ? [{ id: 'r1' }, { id: 'r2' }]
          : [{ id: 'r3' }]
        return {
          ok: true, status: 200, statusText: 'OK',
          headers: { get: () => 'application/json' },
          json: async () => ({ page: callCount, perPage: 2, totalItems: 3, totalPages: 2, items }),
        }
      })
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new RecordService(client, 'posts')

      const result = await svc.getFullList({ batchSize: 2 })

      expect(result).toHaveLength(3)
      expect(result.map(r => r.id)).toEqual(['r1', 'r2', 'r3'])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('returns empty array for empty collection', async () => {
      const { client } = createMockHttpClient({ page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, 'posts')

      const result = await svc.getFullList()

      expect(result).toEqual([])
    })

    it('defaults batchSize to 100 when not specified', async () => {
      const { client, mockFetch } = createMockHttpClient({ page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, 'posts')

      await svc.getFullList()

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('perPage=100')
    })
  })

  describe('getFirstListItem()', () => {
    it('returns first item when found', async () => {
      const record = { id: 'rec_1', title: 'Hello' }
      const { client } = createMockHttpClient({ page: 1, perPage: 1, totalItems: 1, totalPages: 1, items: [record] })
      const svc = new RecordService(client, 'posts')

      const result = await svc.getFirstListItem("title='Hello'")

      expect(result).toEqual(record)
    })

    it('throws ClientResponseError with 404 when no items found', async () => {
      const { client } = createMockHttpClient({ page: 1, perPage: 1, totalItems: 0, totalPages: 0, items: [] })
      const svc = new RecordService(client, 'posts')

      try {
        await svc.getFirstListItem("title='nonexistent'")
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(404)
        expect(err.status).toBe('NOT_FOUND')
        expect(err.message).toContain('posts')
      }
    })
  })

  describe('getOne()', () => {
    it('sends GET to /records/:id and returns the record', async () => {
      const record = { id: 'rec_abc', title: 'My Post' }
      const { client, mockFetch } = createMockHttpClient(record)
      const svc = new RecordService(client, 'posts')

      const result = await svc.getOne('rec_abc')

      expect(result).toEqual(record)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts/records/rec_abc')
      expect(init.method).toBe('GET')
    })

    it('encodes record ID to prevent path traversal', async () => {
      const { client, mockFetch } = createMockHttpClient({ id: '../../secret' })
      const svc = new RecordService(client, 'posts')

      await svc.getOne('../../secret')

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('..%2F..%2Fsecret')
      expect(url).not.toContain('/../../secret')
    })
  })

  describe('create()', () => {
    it('sends POST with body and returns created record', async () => {
      const created = { id: 'rec_new', title: 'New Post' }
      const { client, mockFetch } = createMockHttpClient(created)
      const svc = new RecordService(client, 'posts')

      const result = await svc.create({ title: 'New Post' } as any)

      expect(result).toEqual(created)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts/records')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ title: 'New Post' })
    })
  })

  describe('update()', () => {
    it('sends PATCH to /records/:id with body and returns updated record', async () => {
      const updated = { id: 'rec_1', title: 'Updated' }
      const { client, mockFetch } = createMockHttpClient(updated)
      const svc = new RecordService(client, 'posts')

      const result = await svc.update('rec_1', { title: 'Updated' } as any)

      expect(result).toEqual(updated)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts/records/rec_1')
      expect(init.method).toBe('PATCH')
    })
  })

  describe('delete()', () => {
    it('sends DELETE to /records/:id and returns true', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => ({
        ok: true, status: 204, statusText: 'No Content',
        headers: { get: () => '' },
        json: async () => null,
      }))
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new RecordService(client, 'posts')

      const result = await svc.delete('rec_1')

      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/posts/records/rec_1')
      expect(init.method).toBe('DELETE')
    })
  })

  // ─── Auth Flow Methods ──────────────────────────────────────

  describe('authWithPassword()', () => {
    it('sends POST to auth-with-password and saves token+model to authStore', async () => {
      const authRes = { token: 'jwt_token_abc', record: { id: 'usr_1', email: 'user@test.com' } }
      const { client, mockFetch, authStore } = createMockHttpClient(authRes)
      const svc = new RecordService(client, 'users')

      const result = await svc.authWithPassword('user@test.com', 'password123')

      expect(result.token).toBe('jwt_token_abc')
      expect(result.record.id).toBe('usr_1')
      expect(authStore.getToken()).toBe('jwt_token_abc')
      expect(authStore.getModel()).toEqual({ id: 'usr_1', email: 'user@test.com' })
      expect(authStore.isValid()).toBe(true)

      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/auth-with-password')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ identity: 'user@test.com', password: 'password123' })
    })

    it('does not save to authStore when response has no token', async () => {
      const { client, authStore } = createMockHttpClient({ record: { id: 'usr_1' } })
      const svc = new RecordService(client, 'users')

      await svc.authWithPassword('user@test.com', 'password123')

      expect(authStore.isValid()).toBe(false)
      expect(authStore.getToken()).toBe('')
    })
  })

  describe('authWithOAuth2()', () => {
    it('sends POST with oauth options and saves token to authStore', async () => {
      const authRes = { token: 'oauth_jwt', record: { id: 'usr_2', email: 'oauth@test.com' } }
      const { client, mockFetch, authStore } = createMockHttpClient(authRes)
      const svc = new RecordService(client, 'users')

      const result = await svc.authWithOAuth2({
        provider: 'google',
        code: 'auth_code_123',
        codeVerifier: 'verifier_abc',
        redirectUrl: 'http://localhost/callback',
      })

      expect(result.token).toBe('oauth_jwt')
      expect(authStore.getToken()).toBe('oauth_jwt')
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/auth-with-oauth2')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.provider).toBe('google')
      expect(body.code).toBe('auth_code_123')
    })
  })

  describe('authWithOtp()', () => {
    it('sends POST with otpId/password and saves token to authStore', async () => {
      const authRes = { token: 'otp_jwt', record: { id: 'usr_3' } }
      const { client, mockFetch, authStore } = createMockHttpClient(authRes)
      const svc = new RecordService(client, 'users')

      const result = await svc.authWithOtp('otp_123', 'otp_password')

      expect(result.token).toBe('otp_jwt')
      expect(authStore.getToken()).toBe('otp_jwt')
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/auth-with-otp')
      expect(JSON.parse(init.body)).toEqual({ otpId: 'otp_123', password: 'otp_password' })
    })
  })

  describe('requestPasswordReset()', () => {
    it('sends POST and returns true on success', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.requestPasswordReset('user@test.com')

      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/request-password-reset')
      expect(JSON.parse(init.body)).toEqual({ email: 'user@test.com' })
    })
  })

  describe('confirmPasswordReset()', () => {
    it('sends POST with token, password, and passwordConfirm', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.confirmPasswordReset('reset_token', 'newpass', 'newpass')

      expect(result).toBe(true)
      const [, init] = mockFetch.mock.calls[0]!
      expect(JSON.parse(init.body)).toEqual({ token: 'reset_token', password: 'newpass', passwordConfirm: 'newpass' })
    })
  })

  describe('requestVerification()', () => {
    it('sends POST with email and returns true', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.requestVerification('user@test.com')

      expect(result).toBe(true)
      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/request-verification')
    })
  })

  describe('confirmVerification()', () => {
    it('sends POST with token and returns true', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.confirmVerification('verify_token')

      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/confirm-verification')
      expect(JSON.parse(init.body)).toEqual({ token: 'verify_token' })
    })
  })

  describe('requestEmailChange()', () => {
    it('sends POST with newEmail and returns true', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.requestEmailChange('new@test.com')

      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/request-email-change')
      expect(JSON.parse(init.body)).toEqual({ newEmail: 'new@test.com' })
    })
  })

  describe('confirmEmailChange()', () => {
    it('sends POST with token and password, returns true', async () => {
      const { client, mockFetch } = createMockHttpClient({})
      const svc = new RecordService(client, 'users')

      const result = await svc.confirmEmailChange('change_token', 'current_pass')

      expect(result).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/confirm-email-change')
      expect(JSON.parse(init.body)).toEqual({ token: 'change_token', password: 'current_pass' })
    })
  })

  describe('impersonate()', () => {
    it('sends POST to impersonate/:id and saves token to authStore', async () => {
      const authRes = { token: 'impersonate_jwt', record: { id: 'target_usr' } }
      const { client, mockFetch, authStore } = createMockHttpClient(authRes)
      const svc = new RecordService(client, 'users')

      const result = await svc.impersonate('target_usr', 3600)

      expect(result.token).toBe('impersonate_jwt')
      expect(authStore.getToken()).toBe('impersonate_jwt')
      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toContain('/api/collections/users/impersonate/target_usr')
      expect(JSON.parse(init.body)).toEqual({ duration: 3600 })
    })

    it('does not crash when duration is omitted', async () => {
      const authRes = { token: 'imp_jwt', record: { id: 'usr_x' } }
      const { client } = createMockHttpClient(authRes)
      const svc = new RecordService(client, 'users')

      const result = await svc.impersonate('usr_x')

      expect(result.token).toBe('imp_jwt')
    })
  })

  // ─── Realtime Subscriptions ─────────────────────────────────

  describe('subscribe()', () => {
    it('delegates to realtimeProvider.subscribe with collection name', async () => {
      const { client } = createMockHttpClient()
      const rtProvider = createMockRealtimeProvider()
      const svc = new RecordService(client, 'posts', rtProvider)

      const callback = vi.fn()
      await svc.subscribe(callback)

      expect(rtProvider.subscribe).toHaveBeenCalledWith('posts', expect.any(Function))
    })

    it('throws when realtimeProvider is not configured', async () => {
      const { client } = createMockHttpClient()
      const svc = new RecordService(client, 'posts') // no realtimeProvider

      await expect(svc.subscribe(vi.fn())).rejects.toThrow(
        'Realtime is not configured or supported in this client instance.'
      )
    })

    it('auto-fetches full record on create/update when autoFetch is true', async () => {
      const fullRecord = { id: 'rec_1', title: 'Full Record' }
      const { client } = createMockHttpClient(fullRecord)

      let capturedHandler: Function | null = null
      const rtProvider = {
        subscribe: vi.fn().mockImplementation(async (_topic: string, handler: Function) => {
          capturedHandler = handler
          return () => {}
        }),
        unsubscribe: vi.fn(),
      }

      const svc = new RecordService(client, 'posts', rtProvider)
      const userCallback = vi.fn()

      await svc.subscribe(userCallback, { autoFetch: true })

      // Simulate a create event
      await capturedHandler!({
        action: 'create',
        collectionId: 'posts',
        data: { id: 'rec_1' },
        timestamp: '2026-01-01T00:00:00Z',
      })

      expect(userCallback).toHaveBeenCalledOnce()
      const event = userCallback.mock.calls[0]![0]
      expect(event.record).toEqual(fullRecord)
    })

    it('does NOT auto-fetch on delete events even with autoFetch', async () => {
      const { client, mockFetch } = createMockHttpClient({})

      let capturedHandler: Function | null = null
      const rtProvider = {
        subscribe: vi.fn().mockImplementation(async (_topic: string, handler: Function) => {
          capturedHandler = handler
          return () => {}
        }),
        unsubscribe: vi.fn(),
      }

      const svc = new RecordService(client, 'posts', rtProvider)
      const userCallback = vi.fn()

      await svc.subscribe(userCallback, { autoFetch: true })

      // Simulate a delete event — should NOT trigger getOne
      await capturedHandler!({
        action: 'delete',
        collectionId: 'posts',
        data: { id: 'rec_1' },
        timestamp: '2026-01-01T00:00:00Z',
      })

      // mockFetch should NOT have been called (no autoFetch for deletes)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(userCallback).toHaveBeenCalledOnce()
      expect(userCallback.mock.calls[0]![0].record).toBeUndefined()
    })
  })

  describe('unsubscribe()', () => {
    it('delegates to realtimeProvider.unsubscribe with collection name', async () => {
      const { client } = createMockHttpClient()
      const rtProvider = createMockRealtimeProvider()
      const svc = new RecordService(client, 'posts', rtProvider)

      await svc.unsubscribe()

      expect(rtProvider.unsubscribe).toHaveBeenCalledWith('posts')
    })

    it('silently returns when realtimeProvider is not configured', async () => {
      const { client } = createMockHttpClient()
      const svc = new RecordService(client, 'posts')

      await expect(svc.unsubscribe()).resolves.toBeUndefined()
    })
  })

  // ─── Error Propagation ──────────────────────────────────────

  describe('error propagation', () => {
    it('propagates ClientResponseError from server 400 through getList', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => ({
        ok: false, status: 400, statusText: 'Bad Request',
        headers: { get: () => 'application/json' },
        json: async () => ({ code: 400, status: 'VALIDATION_FAILED', message: 'Bad filter' }),
      }))
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new RecordService(client, 'posts')

      try {
        await svc.getList()
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(400)
      }
    })

    it('propagates ClientResponseError from server 404 through getOne', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => ({
        ok: false, status: 404, statusText: 'Not Found',
        headers: { get: () => 'application/json' },
        json: async () => ({ code: 404, status: 'NOT_FOUND', message: 'Record not found.' }),
      }))
      const client = new HttpClient({ baseUrl: 'http://127.0.0.1:8090', fetch: mockFetch })
      const svc = new RecordService(client, 'posts')

      try {
        await svc.getOne('nonexistent')
        expect.unreachable('Should have thrown')
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(404)
        expect(err.isNotFound()).toBe(true)
      }
    })
  })
})
