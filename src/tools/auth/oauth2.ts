import { BaseApp } from '../../core/base'
import { RecordModel as PBRecord } from '../../core/record'
import { generateRandomString, generateToken } from '../security/crypto'

export interface OAuth2User {
  id: string
  email: string
  name: string
  avatarURL: string
  rawUser: any
}

export interface OAuth2Provider {
  name: string
  displayName: string
  authURL: string
  tokenURL: string
  userInfoURL: string
  scopes: string[]
  pkce: boolean
  getAuthURL(state: string, codeChallenge?: string, redirectURL?: string): string
  exchangeCodeForToken(code: string, codeVerifier?: string, redirectURL?: string): Promise<string>
  getUserInfo(accessToken: string): Promise<OAuth2User>
}

export class OAuth2ProviderRegistry {
  private providers = new Map<string, OAuth2Provider>()

  register(provider: OAuth2Provider): void {
    this.providers.set(provider.name.toLowerCase(), provider)
  }

  get(name: string): OAuth2Provider | undefined {
    return this.providers.get(name.toLowerCase())
  }

  list(): OAuth2Provider[] {
    return Array.from(this.providers.values())
  }

  has(name: string): boolean {
    return this.providers.has(name.toLowerCase())
  }
}

export const oauth2Registry = new OAuth2ProviderRegistry()

// Generic OIDC/OAuth2 provider implementation
export class GenericOAuth2Provider implements OAuth2Provider {
  name: string
  displayName: string
  authURL: string
  tokenURL: string
  userInfoURL: string
  scopes: string[]
  pkce: boolean
  clientId: string
  clientSecret: string
  redirectURL: string

  constructor(config: {
    name: string
    displayName: string
    authURL: string
    tokenURL: string
    userInfoURL: string
    scopes: string[]
    clientId: string
    clientSecret: string
    pkce?: boolean
    redirectURL?: string
  }) {
    this.name = config.name
    this.displayName = config.displayName
    this.authURL = config.authURL
    this.tokenURL = config.tokenURL
    this.userInfoURL = config.userInfoURL
    this.scopes = config.scopes
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.pkce = config.pkce ?? false
    this.redirectURL = config.redirectURL ?? ''
  }

  getAuthURL(state: string, codeChallenge?: string, redirectURL?: string): string {
    const url = new URL(this.authURL)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', this.scopes.join(' '))
    url.searchParams.set('state', state)
    const finalRedirectURL = redirectURL || this.redirectURL
    if (finalRedirectURL) {
      url.searchParams.set('redirect_uri', finalRedirectURL)
    }
    if (this.pkce && codeChallenge) {
      url.searchParams.set('code_challenge', codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
    }
    return url.toString()
  }

  async exchangeCodeForToken(code: string, codeVerifier?: string, redirectURL?: string): Promise<string> {
    const params = new URLSearchParams()
    params.set('grant_type', 'authorization_code')
    params.set('client_id', this.clientId)
    params.set('client_secret', this.clientSecret)
    params.set('code', code)
    const finalRedirectURL = redirectURL || this.redirectURL
    if (finalRedirectURL) {
      params.set('redirect_uri', finalRedirectURL)
    }
    if (this.pkce && codeVerifier) {
      params.set('code_verifier', codeVerifier)
    }

    const response = await fetch(this.tokenURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    const data: any = await response.json()
    return data.access_token
  }

  async getUserInfo(accessToken: string): Promise<OAuth2User> {
    const response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`User info fetch failed: ${response.statusText}`)
    }

    const data = await response.json()
    return this.normalizeUserInfo(data)
  }

  protected normalizeUserInfo(data: any): OAuth2User {
    return {
      id: String(data.id || data.sub || ''),
      email: String(data.email || ''),
      name: String(data.name || data.login || data.username || data.email || ''),
      avatarURL: String(data.avatar_url || data.picture || data.avatar || ''),
      rawUser: data,
    }
  }
}

// Built-in providers
export function registerBuiltInProviders(): void {
  // GitHub
  oauth2Registry.register(new GenericOAuth2Provider({
    name: 'github',
    displayName: 'GitHub',
    authURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    userInfoURL: 'https://api.github.com/user',
    scopes: ['user:email'],
    clientId: '',
    clientSecret: '',
  }))

  // Google
  oauth2Registry.register(new GenericOAuth2Provider({
    name: 'google',
    displayName: 'Google',
    authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile'],
    clientId: '',
    clientSecret: '',
    pkce: true,
  }))

  // Discord
  oauth2Registry.register(new GenericOAuth2Provider({
    name: 'discord',
    displayName: 'Discord',
    authURL: 'https://discord.com/oauth2/authorize',
    tokenURL: 'https://discord.com/api/oauth2/token',
    userInfoURL: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
    clientId: '',
    clientSecret: '',
  }))

  // Facebook
  oauth2Registry.register(new GenericOAuth2Provider({
    name: 'facebook',
    displayName: 'Facebook',
    authURL: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenURL: 'https://graph.facebook.com/v12.0/oauth/access_token',
    userInfoURL: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    scopes: ['email', 'public_profile'],
    clientId: '',
    clientSecret: '',
  }))
}

export async function handleOAuth2Callback(
  app: BaseApp,
  providerName: string,
  code: string,
  codeVerifier?: string,
  redirectURL?: string
): Promise<{ user: OAuth2User; token: string }> {
  const provider = oauth2Registry.get(providerName)
  if (!provider) {
    throw new Error(`Unknown OAuth2 provider: ${providerName}`)
  }

  const accessToken = await provider.exchangeCodeForToken(code, codeVerifier, redirectURL)
  const user = await provider.getUserInfo(accessToken)

  return { user, token: accessToken }
}

export async function linkExternalAuth(
  app: BaseApp,
  record: PBRecord,
  provider: string,
  providerId: string
): Promise<void> {
  const existing = await app.db().queryOne<any>(
    `SELECT * FROM _externalAuths WHERE provider = ? AND providerId = ?`,
    [provider, providerId]
  )

  if (existing) {
    throw new Error('This external auth is already linked to another account.')
  }

  const now = new Date().toISOString()
  await app.db().execute(
    `INSERT INTO _externalAuths (id, recordRef, collectionId, provider, providerId, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateToken(16),
      record.id,
      record.collectionId,
      provider,
      providerId,
      now,
      now
    ]
  )
}

export async function unlinkExternalAuth(
  app: BaseApp,
  record: PBRecord,
  provider: string
): Promise<void> {
  await app.db().execute(
    `DELETE FROM _externalAuths WHERE recordRef = ? AND collectionId = ? AND provider = ?`,
    [record.id, record.collectionId, provider]
  )
}
