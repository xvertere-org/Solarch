import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { AuthService } from '../auth/auth-service.js'
import { SessionStore } from '../auth/session-store.js'
import { PlatformConfig } from '../config.js'

describe('AuthService (Phase 2)', () => {
  let tempDir: string
  let sessionStore: SessionStore
  let config: PlatformConfig
  let authService: AuthService

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-auth-service-test-'))
    sessionStore = new SessionStore(tempDir)
    config = new PlatformConfig({ apiBaseUrl: 'https://mock.api.solarch.in' })
    authService = new AuthService(config, sessionStore)
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
    delete process.env.SOLARCH_TOKEN
  })

  it('1. resolves unauthenticated when no credentials exist', async () => {
    const resolved = await authService.resolveSession()
    expect(resolved.session.isAuthenticated()).toBe(false)
    expect(resolved.source).toBe('none')
    expect(resolved.credentials).toBeUndefined()
  })

  it('2. prioritizes explicit CLI token over environment and session store', async () => {
    process.env.SOLARCH_TOKEN = 'env-token-456'
    await sessionStore.saveCredentials({ accessToken: 'session-token-789' })

    // Mock fetch for whoami
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'user-flag-1', email: 'flag@example.com', currentOrgId: 'org-flag-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const resolved = await authService.resolveSession('explicit-token-123')
    expect(resolved.session.isAuthenticated()).toBe(true)
    expect(resolved.source).toBe('flag')
    expect(resolved.session.userId).toBe('user-flag-1')
    expect(resolved.session.orgId).toBe('org-flag-1')
    expect(resolved.user?.email).toBe('flag@example.com')

    fetchSpy.mockRestore()
  })

  it('3. prioritizes SOLARCH_TOKEN over session store and does not write to disk', async () => {
    process.env.SOLARCH_TOKEN = 'env-token-456'
    await sessionStore.saveCredentials({ accessToken: 'session-token-789' })

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'user-env-1', email: 'env@example.com', currentOrgId: 'org-env-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const resolved = await authService.resolveSession()
    expect(resolved.session.isAuthenticated()).toBe(true)
    expect(resolved.source).toBe('env')
    expect(resolved.user?.email).toBe('env@example.com')

    // Session store on disk should remain untouched
    const stored = await sessionStore.loadCredentials()
    expect(stored?.accessToken).toBe('session-token-789')

    fetchSpy.mockRestore()
  })

  it('4. exchanges authorization code and saves session credentials', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/auth/token')) {
        return new Response(
          JSON.stringify({
            accessToken: 'new-access-token-999',
            refreshToken: 'new-refresh-token-888',
            expiresIn: 3600,
            user: { id: 'user-pkce-1', email: 'pkce@example.com', currentOrgId: 'org-pkce-1' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const resolved = await authService.exchangeAuthorizationCode({
      code: 'code-123',
      codeVerifier: 'verifier-456',
      redirectUri: 'http://127.0.0.1:5000/auth/callback',
    })

    expect(resolved.session.isAuthenticated()).toBe(true)
    expect(resolved.session.userId).toBe('user-pkce-1')
    expect(resolved.credentials?.accessToken).toBe('new-access-token-999')
    expect(resolved.credentials?.refreshToken).toBe('new-refresh-token-888')

    // Verified saved to disk
    const stored = await sessionStore.loadCredentials()
    expect(stored?.accessToken).toBe('new-access-token-999')

    fetchSpy.mockRestore()
  })

  it('5. handles token refresh when stored access token has expired', async () => {
    await sessionStore.saveCredentials({
      accessToken: 'expired-access-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: Date.now() - 10000, // expired
    })

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({
            accessToken: 'refreshed-access-token',
            refreshToken: 'refreshed-refresh-token',
            expiresIn: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.toString().includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'user-refreshed', email: 'refreshed@example.com' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const resolved = await authService.resolveSession()
    expect(resolved.session.isAuthenticated()).toBe(true)
    expect(resolved.credentials?.accessToken).toBe('refreshed-access-token')

    const stored = await sessionStore.loadCredentials()
    expect(stored?.accessToken).toBe('refreshed-access-token')

    fetchSpy.mockRestore()
  })
})
