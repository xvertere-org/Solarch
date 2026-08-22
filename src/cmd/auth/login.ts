/**
 * Solarch CLI Login Command (Phase 2)
 *
 * Implements `solarch login [--token <token>] [--no-browser]`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { AuthService } from '../../platform/auth/auth-service.js'
import { AuthCallbackServer } from '../../platform/auth/callback-server.js'
import { openBrowser } from '../../platform/auth/browser.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'
import { printCommandHeader } from '../../ui/banner.js'

export interface LoginOptions {
  token?: string
  browser?: boolean
  authService?: AuthService
}

export async function runLogin(options: LoginOptions = {}): Promise<void> {
  const authService = options.authService ?? new AuthService()

  // 1. Direct Token Mode (CI / headless)
  if (options.token && options.token.trim().length > 0) {
    const s = createSpinner()
    s.start('Verifying Solarch Platform token...')
    try {
      const resolved = await authService.loginWithToken(options.token, true)
      s.stop('Token verified.')
      const userDesc = resolved.user?.email
        ? `${resolved.user.email} (${resolved.user.id})`
        : resolved.session.userId || 'Authenticated User'
      output.success(`Successfully authenticated with Solarch Platform as ${colors.cyan(userDesc)}`)
      return
    } catch (err: any) {
      s.stop('Authentication failed.')
      output.failure(`Invalid token: ${err.message}`)
      throw err
    }
  }

  // 2. Interactive Browser Handoff with PKCE & State
  const callbackServer = new AuthCallbackServer()
  const challenge = callbackServer.getChallenge()
  const config = authService.getConfig()

  try {
    // Start listening on 127.0.0.1:0
    const callbackPromise = callbackServer.start()
    const redirectUri = callbackServer.getRedirectUri()

    const authUrl = new URL(config.authBaseUrl)
    authUrl.searchParams.set('client_id', 'solarch_cli')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', challenge.state)
    authUrl.searchParams.set('code_challenge', challenge.challenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    const authUrlString = authUrl.toString()

    printCommandHeader('Solarch Platform Authentication')
    output.info('Opening your browser to authenticate with Solarch Platform...')
    console.log(`\n  ${colors.cyan(authUrlString)}\n`)

    if (options.browser !== false) {
      try {
        await openBrowser(authUrlString)
      } catch {
        // Fallback gracefully if browser cannot be launched
      }
    }

    const s = createSpinner()
    s.start('Waiting for browser authentication...')

    const { code } = await callbackPromise
    s.message('Exchanging authorization code...')

    const resolved = await authService.exchangeAuthorizationCode({
      code,
      codeVerifier: challenge.verifier,
      redirectUri,
    })

    s.stop('Authentication confirmed.')

    const userDesc = resolved.user?.email
      ? `${resolved.user.email} (${resolved.user.id})`
      : resolved.session.userId || 'Authenticated User'
    output.success(`Successfully logged in as ${colors.cyan(userDesc)}`)
  } catch (err: any) {
    callbackServer.close()
    output.failure(`Login failed: ${err.message}`)
    throw err
  }
}
