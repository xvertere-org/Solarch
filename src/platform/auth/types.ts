/**
 * Solarch CLI Platform Authentication & Session Types (Phase 2)
 */

import { PlatformSession } from '../../ecosystem/session.js'

export type AuthSource = 'flag' | 'env' | 'session' | 'none'

export interface SessionCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  tokenType?: string
}

export interface ResolvedAuthSession {
  credentials?: SessionCredentials
  session: PlatformSession
  source: AuthSource
  user?: UserInfo
}

export interface PKCEChallenge {
  verifier: string
  challenge: string
  state: string
}

export interface TokenExchangeRequest {
  code: string
  codeVerifier: string
  redirectUri: string
}

export interface UserInfo {
  id: string
  email: string
  name?: string
  currentOrgId?: string
  tier?: string
}

export interface OrganizationInfo {
  id: string
  name: string
  slug: string
  role?: string
}

export interface ProjectInfo {
  id: string
  name: string
  slug: string
  orgId: string
  createdAt?: string
}

export interface TokenExchangeResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  user: UserInfo
}
