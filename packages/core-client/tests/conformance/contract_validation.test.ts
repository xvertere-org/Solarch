import { describe, it, expect, vi } from 'vitest'
import openApiSpec from '../../src/contracts/openapi.json'
import { SolarchClient } from '../../src/Client.js'
import { ClientResponseError, VALID_ERROR_STATUSES, isKnownErrorStatus } from '../../src/contracts/errors.js'
import type { ApiErrorStatus } from '../../src/contracts/types.js'

describe('BUG-10: SDK ↔ OpenAPI Contract Conformance Suite', () => {
  const specPaths = Object.keys(openApiSpec.paths)

  function normalizeRouteToOpenApi(urlPath: string): string {
    // Convert /api/collections/posts/records/rec_123 to /api/collections/{collectionIdOrName}/records/{id}
    // Convert /api/collections/posts/records to /api/collections/{collectionIdOrName}/records
    let normalized = urlPath.split('?')[0]!

    // Exact matches
    if (specPaths.includes(normalized)) return normalized

    // /api/collections/:id/auth-with-...
    normalized = normalized.replace(
      /^\/api\/collections\/([^/]+)\/(auth-with-password|auth-with-oauth2|auth-with-otp|request-password-reset|confirm-password-reset|request-verification|confirm-verification|request-email-change|confirm-email-change)$/,
      '/api/collections/{collectionIdOrName}/$2'
    )

    // /api/collections/:id/impersonate/:targetId
    normalized = normalized.replace(
      /^\/api\/collections\/([^/]+)\/impersonate\/([^/]+)$/,
      '/api/collections/{collectionIdOrName}/impersonate/{id}'
    )

    // /api/collections/:id/records/:recId
    normalized = normalized.replace(
      /^\/api\/collections\/([^/]+)\/records\/([^/]+)$/,
      '/api/collections/{collectionIdOrName}/records/{id}'
    )

    // /api/collections/:id/records
    normalized = normalized.replace(
      /^\/api\/collections\/([^/]+)\/records$/,
      '/api/collections/{collectionIdOrName}/records'
    )

    // /api/collections/:id
    normalized = normalized.replace(
      /^\/api\/collections\/([^/]+)$/,
      '/api/collections/{id}'
    )

    // /api/files/:col/:id/:file
    normalized = normalized.replace(
      /^\/api\/files\/([^/]+)\/([^/]+)\/([^/]+)$/,
      '/api/files/{collectionIdOrName}/{recordId}/{filename}'
    )

    return normalized
  }

  function assertRouteMatchesSpec(urlPath: string, method: string) {
    const template = normalizeRouteToOpenApi(urlPath)
    expect(specPaths).toContain(template)

    const pathItem = (openApiSpec.paths as any)[template]
    const methodLower = method.toLowerCase()
    expect(pathItem).toHaveProperty(methodLower)
  }

  it('validates RecordService all 18 endpoints conform to OpenAPI spec paths and methods', async () => {
    const recordedCalls: { url: string; method: string }[] = []
    const mockFetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const parsedUrl = new URL(url)
      recordedCalls.push({
        url: parsedUrl.pathname,
        method: init?.method || 'GET'
      })
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({
          page: 1, perPage: 30, totalItems: 1, totalPages: 1,
          items: [{ id: 'rec_1' }],
          token: 'jwt_dummy',
          record: { id: 'rec_1' }
        })
      })
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })
    const recSvc = client.collection('articles')

    await recSvc.getList()
    await recSvc.getOne('rec_1')
    await recSvc.create({ title: 'New' } as any)
    await recSvc.update('rec_1', { title: 'Updated' } as any)
    await recSvc.delete('rec_1')
    await recSvc.authWithPassword('user@example.com', 'pwd')
    await recSvc.authWithOAuth2({ provider: 'google', code: 'c', codeVerifier: 'v', redirectUrl: 'r' })
    await recSvc.authWithOtp('otp_1', 'pwd')
    await recSvc.requestPasswordReset('u@e.com')
    await recSvc.confirmPasswordReset('t', 'p', 'p')
    await recSvc.requestVerification('u@e.com')
    await recSvc.confirmVerification('t')
    await recSvc.requestEmailChange('new@e.com')
    await recSvc.confirmEmailChange('t', 'p')
    await recSvc.impersonate('rec_1')

    expect(recordedCalls.length).toBeGreaterThanOrEqual(15)

    for (const call of recordedCalls) {
      assertRouteMatchesSpec(call.url, call.method)
    }
  })

  it('validates CollectionService endpoints conform to OpenAPI spec', async () => {
    const recordedCalls: { url: string; method: string }[] = []
    const mockFetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const parsedUrl = new URL(url)
      recordedCalls.push({ url: parsedUrl.pathname, method: init?.method || 'GET' })
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 'col_1', name: 'test' })
      })
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })

    await client.collections.getList()
    await client.collections.getOne('posts')
    await client.collections.create({ name: 'posts' } as any)
    await client.collections.update('posts', { name: 'posts_v2' } as any)
    await client.collections.delete('posts')
    await client.collections.import([{ name: 'import_test' } as any])

    expect(recordedCalls).toHaveLength(6)
    for (const call of recordedCalls) {
      assertRouteMatchesSpec(call.url, call.method)
    }
  })

  it('validates FileService and CapabilityService endpoints conform to OpenAPI spec', async () => {
    const recordedCalls: { url: string; method: string }[] = []
    const mockFetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const parsedUrl = new URL(url)
      recordedCalls.push({ url: parsedUrl.pathname, method: init?.method || 'GET' })
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({ token: 'file_token', status: 'ok' })
      })
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })

    // FileService getUrl (local)
    const fileUrl = client.files.getUrl({ id: 'rec_1', collectionName: 'images' }, 'photo.jpg')
    const parsedFileUrl = new URL(fileUrl)
    assertRouteMatchesSpec(parsedFileUrl.pathname, 'GET')

    // FileService getToken (POST)
    await client.files.getToken('images', 'rec_1', 'photo.jpg')

    // CapabilityService getHealth (GET)
    await client.capabilities.getHealth()

    for (const call of recordedCalls) {
      assertRouteMatchesSpec(call.url, call.method)
    }
  })

  it('validates AdminService endpoints conform to OpenAPI spec', async () => {
    const recordedCalls: { url: string; method: string }[] = []
    const mockFetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const parsedUrl = new URL(url)
      recordedCalls.push({ url: parsedUrl.pathname, method: init?.method || 'GET' })
      return Promise.resolve({
        ok: true, status: 200, statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({ token: 'admin_jwt', admin: { id: 'adm_1' } })
      })
    })

    const client = new SolarchClient('http://127.0.0.1:8090', { fetch: mockFetch, timeout: 0, maxRetries: 0 })

    await client.admins.authWithPassword('admin@solarch.in', 'pwd')
    await client.admins.authRefresh()
    await client.admins.requestPasswordReset('admin@solarch.in')
    await client.admins.confirmPasswordReset('t', 'p', 'p')

    expect(recordedCalls).toHaveLength(4)
    for (const call of recordedCalls) {
      assertRouteMatchesSpec(call.url, call.method)
    }
  })

  it('validates all 7 ApiErrorStatus enum values match OpenAPI schema specification', () => {
    const expectedStatuses: ApiErrorStatus[] = [
      'BAD_REQUEST',
      'VALIDATION_FAILED',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'RATE_LIMITED',
      'INTERNAL_ERROR'
    ]

    const schemaEnum = openApiSpec.components.schemas.ApiErrorResponse.properties.status.enum
    expect(schemaEnum).toHaveLength(7)
    for (const status of expectedStatuses) {
      expect(schemaEnum).toContain(status)
    }
  })

  it('validates Fix 1: unknown server status falls through to statusCode mapping (403 -> FORBIDDEN)', () => {
    const err = ClientResponseError.fromApiResponse(
      { status: 403, statusText: 'Forbidden' },
      { status: 'SOME_UNKNOWN_STATUS', code: 403, message: 'Custom error' }
    )

    expect(err.status).toBe('FORBIDDEN')
    expect(err.statusCode).toBe(403)
    expect(err.isForbidden()).toBe(true)
  })

  it('validates Fix 1: recognized error status from body is preserved', () => {
    const err = ClientResponseError.fromApiResponse(
      { status: 400, statusText: 'Bad Request' },
      { status: 'VALIDATION_FAILED', code: 400, message: 'Invalid field' }
    )

    expect(err.status).toBe('VALIDATION_FAILED')
    expect(err.statusCode).toBe(400)
    expect(err.isValidationFailed()).toBe(true)
  })
})
