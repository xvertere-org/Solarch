/**
 * Solarch CLI Authentication Service (Phase 2)
 *
 * Implements credential precedence, token validation, refresh handling,
 * and authorization code exchange.
 */

import { PlatformConfig } from '../config.js'
import { SessionStore } from './session-store.js'
import {
  AuthSource,
  ResolvedAuthSession,
  SessionCredentials,
  TokenExchangeRequest,
  TokenExchangeResponse,
  UserInfo,
} from './types.js'
import { PlatformSession } from '../../ecosystem/session.js'
import { PlatformClient } from '../client/platform-client.js'
import { UsersClient } from '../client/users.js'

export class AuthService {
  private config: PlatformConfig
  private sessionStore: SessionStore
  private usersClient: UsersClient
  private platformClient: PlatformClient

  constructor(
    config: PlatformConfig = PlatformConfig.default(),
    sessionStore: SessionStore = new SessionStore()
  ) {
    this.config = config
    this.sessionStore = sessionStore
    this.usersClient = new UsersClient(config)
    this.platformClient = new PlatformClient(config)
  }

  public getConfig(): PlatformConfig {
    return this.config
  }

  public getSessionStore(): SessionStore {
    return this.sessionStore
  }

  /**
   * Resolves authentication state following strict precedence:
   * 1. Explicit CLI token flag
   * 2. SOLARCH_TOKEN environment variable (ephemeral)
   * 3. Persisted SessionStore (~/.solarch/session.json)
   * 4. Unauthenticated
   */
  public async resolveSession(explicitToken?: string): Promise<ResolvedAuthSession> {
    // 1. Explicit token
    if (explicitToken && explicitToken.trim().length > 0) {
      const trimmed = explicitToken.trim()
      try {
        const user = await this.usersClient.validateToken(trimmed)
        return {
          credentials: { accessToken: trimmed },
          session: new PlatformSession({
            status: 'authenticated',
            userId: user.id,
            orgId: user.currentOrgId,
          }),
          source: 'flag',
          user,
        }
      } catch {
        return {
          session: new PlatformSession({ status: 'unauthenticated' }),
          source: 'flag',
        }
      }
    }

    // 2. SOLARCH_TOKEN environment variable
    if (process.env.SOLARCH_TOKEN && process.env.SOLARCH_TOKEN.trim().length > 0) {
      const trimmed = process.env.SOLARCH_TOKEN.trim()
      try {
        const user = await this.usersClient.validateToken(trimmed)
        return {
          credentials: { accessToken: trimmed },
          session: new PlatformSession({
            status: 'authenticated',
            userId: user.id,
            orgId: user.currentOrgId,
          }),
          source: 'env',
          user,
        }
      } catch {
        return {
          session: new PlatformSession({ status: 'unauthenticated' }),
          source: 'env',
        }
      }
    }

    // 3. Persisted session store
    const stored = await this.sessionStore.loadCredentials()
    if (stored && stored.accessToken) {
      // Check expiry & attempt refresh if needed
      if (stored.expiresAt && Date.now() >= stored.expiresAt && stored.refreshToken) {
        try {
          const refreshed = await this.refreshSession(stored.refreshToken)
          await this.sessionStore.saveCredentials(refreshed)
          const user = await this.usersClient.validateToken(refreshed.accessToken)
          return {
            credentials: refreshed,
            session: new PlatformSession({
              status: 'authenticated',
              userId: user.id,
              orgId: user.currentOrgId,
            }),
            source: 'session',
            user,
          }
        } catch {
          await this.sessionStore.clearCredentials()
          return {
            session: new PlatformSession({ status: 'unauthenticated' }),
            source: 'none',
          }
        }
      }

      try {
        const user = await this.usersClient.validateToken(stored.accessToken)
        return {
          credentials: stored,
          session: new PlatformSession({
            status: 'authenticated',
            userId: user.id,
            orgId: user.currentOrgId,
          }),
          source: 'session',
          user,
        }
      } catch {
        // Token invalid/expired - try refresh before clearing
        if (stored.refreshToken) {
          try {
            const refreshed = await this.refreshSession(stored.refreshToken)
            await this.sessionStore.saveCredentials(refreshed)
            const user = await this.usersClient.validateToken(refreshed.accessToken)
            return {
              credentials: refreshed,
              session: new PlatformSession({
                status: 'authenticated',
                userId: user.id,
                orgId: user.currentOrgId,
              }),
              source: 'session',
              user,
            }
          } catch {
            await this.sessionStore.clearCredentials()
          }
        } else {
          await this.sessionStore.clearCredentials()
        }
      }
    }

    // 4. Unauthenticated
    return {
      session: new PlatformSession({ status: 'unauthenticated' }),
      source: 'none',
    }
  }

  /**
   * Exchanges an authorization code + PKCE verifier for a full session.
   * Persists the resulting credentials to the machine SessionStore.
   */
  public async exchangeAuthorizationCode(
    req: TokenExchangeRequest
  ): Promise<ResolvedAuthSession> {
    const res = await this.platformClient.post<TokenExchangeResponse>('/v1/auth/token', {
      grantType: 'authorization_code',
      code: req.code,
      codeVerifier: req.codeVerifier,
      redirectUri: req.redirectUri,
    })

    const credentials: SessionCredentials = {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
    }

    await this.sessionStore.saveCredentials(credentials)

    return {
      credentials,
      session: new PlatformSession({
        status: 'authenticated',
        userId: res.user?.id,
        orgId: res.user?.currentOrgId,
      }),
      source: 'session',
      user: res.user,
    }
  }

  /**
   * Refreshes an expired access token using a refresh token.
   */
  public async refreshSession(refreshToken: string): Promise<SessionCredentials> {
    const res = await this.platformClient.post<{
      accessToken: string
      refreshToken?: string
      expiresIn?: number
    }>('/v1/auth/refresh', {
      grantType: 'refresh_token',
      refreshToken,
    })

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken || refreshToken,
      expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
    }
  }

  /**
   * Direct token authentication (CI/headless).
   */
  public async loginWithToken(
    token: string,
    persist: boolean = true
  ): Promise<ResolvedAuthSession> {
    const trimmed = token.trim()
    const user = await this.usersClient.validateToken(trimmed)
    const credentials: SessionCredentials = { accessToken: trimmed }

    if (persist) {
      await this.sessionStore.saveCredentials(credentials)
    }

    return {
      credentials,
      session: new PlatformSession({
        status: 'authenticated',
        userId: user.id,
        orgId: user.currentOrgId,
      }),
      source: persist ? 'session' : 'flag',
      user,
    }
  }

  /**
   * Logs out by clearing machine credentials.
   */
  public async logout(): Promise<void> {
    await this.sessionStore.clearCredentials()
  }
}
