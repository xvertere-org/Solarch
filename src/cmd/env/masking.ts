/**
 * Central secret masking utilities for Solarch CLI.
 * Ensures zero leakage of JWT secrets, encryption keys, auth tokens, and database passwords.
 */

const SENSITIVE_KEY_PATTERNS = [
  /jwt/i,
  /secret/i,
  /key/i,
  /pass/i,
  /token/i,
  /private/i,
  /credential/i,
  /auth_secret/i,
]

/**
 * Determines whether an environment variable key holds sensitive data
 */
export function isSensitiveKey(key: string): boolean {
  if (/^DATABASE_URL$/i.test(key)) return false // Handled specifically with URL password masking
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * Masks sensitive passwords inside database connection strings
 */
export function maskDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined
  try {
    const parsed = new URL(rawUrl)
    if (parsed.password) {
      parsed.password = '****'
    }
    return parsed.toString()
  } catch {
    return rawUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3')
  }
}

/**
 * Masks a single raw secret string, returning 'configured'
 */
export function maskSecret(value?: string): string {
  if (!value || value.trim().length === 0) {
    return 'missing'
  }
  return 'configured'
}

/**
 * Masks an environment key-value pair appropriately for safe terminal display or JSON reporting
 */
export function maskEnvValue(key: string, value?: string): string {
  if (!value) return 'missing'

  if (/DATABASE_URL/i.test(key)) {
    return maskDatabaseUrl(value) || 'valid'
  }

  if (isSensitiveKey(key)) {
    return 'configured'
  }

  return value
}
