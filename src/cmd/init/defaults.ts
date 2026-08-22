/**
 * Solarch CLI Init Defaults & System Constants
 */

export const DEFAULT_PROJECT_NAME = 'my-app'
export const DEFAULT_DATABASE: 'sqlite' | 'postgres' | 'mongodb' = 'sqlite'
export const DEFAULT_PORT = 8090
export const DEFAULT_RATE_LIMIT = true
export const DEFAULT_AI = false
export const DEFAULT_AUTH_PROVIDERS: string[] = ['email']

export const VALID_DATABASES = ['sqlite', 'postgres', 'mongodb'] as const
export const VALID_AUTH_PROVIDERS = ['email', 'google', 'github', 'discord'] as const
