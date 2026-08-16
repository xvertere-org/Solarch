import { describe, it, expect, vi } from 'vitest'
import { SolarchClient } from '../../src/Client.js'
import { ClientResponseError } from '../../src/contracts/errors.js'

function jsonResponse(status: number, data: any, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (h: string) => {
        if (h.toLowerCase() === 'content-type') return 'application/json'
        return headers[h.toLowerCase()] || null
      }
    },
    json: async () => data
  }
}

function makeMockJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub, exp: 9999999999 })).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('Phase 4: Expanded Auth Integration Flows', () => {
  describe('OAuth2 Authentication Flow', () => {
    it('successfully completes OAuth2 auth exchange and persists token & model', async () => {
      const authPayload = {
        token: makeMockJwt('usr_google_123'),
        record: {
          id: 'usr_google_123',
          email: 'developer@google.com',
          name: 'Google Dev',
          collectionName: 'users'
        }
      }

      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(200, authPayload))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      const res = await client.collection('users').authWithOAuth2({
        provider: 'google',
        code: 'auth_code_xyz',
        codeVerifier: 'verifier_abc',
        redirectUrl: 'http://localhost:3000/callback',
        createData: { role: 'developer' }
      })

      expect(res.token).toBe(authPayload.token)
      expect(res.record.id).toBe('usr_google_123')
      expect(client.authStore.isValid()).toBe(true)
      expect(client.authStore.getToken()).toBe(authPayload.token)
      expect(client.authStore.getModel()).toEqual(authPayload.record)

      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toBe('http://127.0.0.1:8090/api/collections/users/auth-with-oauth2')
      expect(init.method).toBe('POST')
      const sentBody = JSON.parse(init.body)
      expect(sentBody.provider).toBe('google')
      expect(sentBody.code).toBe('auth_code_xyz')
      expect(sentBody.createData).toEqual({ role: 'developer' })
    })

    it('handles OAuth2 exchange rejection (e.g. invalid code or verifier mismatch)', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(400, {
        code: 400,
        status: 'VALIDATION_FAILED',
        message: 'Invalid OAuth2 code or state parameter.'
      }))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      await expect(client.collection('users').authWithOAuth2({
        provider: 'github',
        code: 'bad_code',
        codeVerifier: 'verifier',
        redirectUrl: 'http://localhost/cb'
      })).rejects.toThrow(ClientResponseError)

      expect(client.authStore.isValid()).toBe(false)
    })
  })

  describe('OTP Authentication Flow', () => {
    it('authenticates with OTP ID + password, saves session to authStore', async () => {
      const authPayload = {
        token: makeMockJwt('usr_otp_1'),
        record: { id: 'usr_otp_1', email: 'otp-user@solarch.in' }
      }
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(200, authPayload))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      const res = await client.collection('users').authWithOtp('otp_req_999', '123456')

      expect(res.token).toBe(authPayload.token)
      expect(client.authStore.getToken()).toBe(authPayload.token)
      expect(client.authStore.isValid()).toBe(true)

      const [url, init] = mockFetch.mock.calls[0]!
      expect(url).toBe('http://127.0.0.1:8090/api/collections/users/auth-with-otp')
      expect(JSON.parse(init.body)).toEqual({ otpId: 'otp_req_999', password: '123456' })
    })

    it('rejects invalid or expired OTP code', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(400, {
        code: 400,
        status: 'VALIDATION_FAILED',
        message: 'OTP has expired or is invalid.'
      }))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      await expect(client.collection('users').authWithOtp('otp_999', '000000')).rejects.toThrow(
        ClientResponseError
      )
    })
  })

  describe('Email Change & Verification Flow', () => {
    it('executes full email change request and confirmation cycle', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, {})) // request
        .mockResolvedValueOnce(jsonResponse(200, {})) // confirm

      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      const reqSuccess = await client.collection('users').requestEmailChange('new_email@example.com')
      expect(reqSuccess).toBe(true)

      const confirmSuccess = await client.collection('users').confirmEmailChange('change_token_777', 'current_password')
      expect(confirmSuccess).toBe(true)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[0]![0]).toContain('/api/collections/users/request-email-change')
      expect(mockFetch.mock.calls[1]![0]).toContain('/api/collections/users/confirm-email-change')
    })

    it('executes email verification request and token confirmation', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(jsonResponse(200, {}))
        .mockResolvedValueOnce(jsonResponse(200, {}))

      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch })

      const reqSuccess = await client.collection('users').requestVerification('user@example.com')
      expect(reqSuccess).toBe(true)

      const confirmSuccess = await client.collection('users').confirmVerification('verify_token_888')
      expect(confirmSuccess).toBe(true)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[0]![0]).toContain('/api/collections/users/request-verification')
      expect(mockFetch.mock.calls[1]![0]).toContain('/api/collections/users/confirm-verification')
    })
  })

  describe('HTTP Status Code Error Classification', () => {
    it('maps 401 Unauthorized correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(401, {
        code: 401,
        status: 'UNAUTHORIZED',
        message: 'The request requires valid authentication.'
      }))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })

      try {
        await client.collection('secrets').getList()
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(401)
        expect(err.isUnauthorized()).toBe(true)
        expect(err.isForbidden()).toBe(false)
      }
    })

    it('maps 403 Forbidden correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(403, {
        code: 403,
        status: 'FORBIDDEN',
        message: 'You do not have permission to view this collection.'
      }))
      const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })

      try {
        await client.collection('admin_only').getList()
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(403)
        expect(err.isForbidden()).toBe(true)
      }
    })
  })
})
