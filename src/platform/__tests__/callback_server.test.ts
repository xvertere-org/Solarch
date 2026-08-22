import { describe, it, expect, afterEach } from 'vitest'
import { AuthCallbackServer } from '../auth/callback-server.js'

describe('AuthCallbackServer & PKCE (Phase 2)', () => {
  let server: AuthCallbackServer | null = null

  afterEach(() => {
    if (server) {
      server.close()
      server = null
    }
  })

  it('1. generates valid PKCE verifier, challenge, and state', () => {
    const pkce = AuthCallbackServer.generatePKCE()
    expect(pkce.verifier).toBeDefined()
    expect(pkce.verifier.length).toBeGreaterThanOrEqual(43)
    expect(pkce.challenge).toBeDefined()
    expect(pkce.state).toBeDefined()
    expect(pkce.state.length).toBe(48)
  })

  it('2. binds to 127.0.0.1 on dynamic port and processes authorization callback', async () => {
    server = new AuthCallbackServer()
    const challenge = server.getChallenge()

    const port = await server.listen()
    expect(port).toBeGreaterThan(0)

    const listenPromise = server.waitForCallback(5000)

    const callbackUrl = `http://127.0.0.1:${port}/auth/callback?code=auth-code-test-123&state=${challenge.state}`
    const response = await fetch(callbackUrl)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Authentication Successful')

    const result = await listenPromise
    expect(result.code).toBe('auth-code-test-123')
    expect(result.state).toBe(challenge.state)
  })

  it('3. rejects callback with state mismatch', async () => {
    server = new AuthCallbackServer()
    const port = await server.listen()
    const listenPromise = server.waitForCallback(5000)
    const errorPromise = expect(listenPromise).rejects.toThrow('State mismatch in authentication callback.')

    const callbackUrl = `http://127.0.0.1:${port}/auth/callback?code=test-code&state=wrong-state`
    const response = await fetch(callbackUrl)
    expect(response.status).toBe(400)
    const html = await response.text()
    expect(html).toContain('Invalid State Parameter')

    await errorPromise
  })

  it('4. rejects callback with error query parameter', async () => {
    server = new AuthCallbackServer()
    const port = await server.listen()
    const listenPromise = server.waitForCallback(5000)
    const errorPromise = expect(listenPromise).rejects.toThrow('Authentication failed: User cancelled')

    const callbackUrl = `http://127.0.0.1:${port}/auth/callback?error=access_denied&error_description=User+cancelled`
    const response = await fetch(callbackUrl)
    expect(response.status).toBe(400)

    await errorPromise
  })
})
