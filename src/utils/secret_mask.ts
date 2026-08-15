import { ResolvedDatabaseConfig } from '../core/config_types'

/**
 * Safely masks passwords, secrets, and auth tokens in database connection strings and URIs.
 * Never throws on malformed input.
 */
export function maskConnectionString(uri?: string): string {
  if (!uri || typeof uri !== 'string') return ''
  const trimmed = uri.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    if (parsed.password) {
      parsed.password = '***'
    }
    // Mask sensitive query params if present
    const sensitiveParams = ['password', 'secret', 'token', 'apikey', 'api_key', 'auth']
    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***')
      }
    }
    return parsed.toString()
  } catch {
    // Fallback regex masking for non-standard URI formats or unparseable URIs
    return trimmed.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
  }
}

/**
 * Formats a user-friendly, secret-free summary of the active database destination
 * for startup banners, diagnostics, and logs.
 */
export function formatDatabaseDestination(config: ResolvedDatabaseConfig, dataDir: string): string {
  if (config.provider === 'sqlite') {
    return `sqlite (dataDir: ${dataDir})`
  }
  if (config.provider === 'mongodb') {
    const masked = maskConnectionString(config.connectionString)
    return `mongodb (target: ${masked || 'none'})`
  }
  const driver = config.driver ?? 'postgres'
  const mode = config.mode ?? (driver === 'postgres' ? 'tcp' : 'http')
  const masked = maskConnectionString(config.connectionString)
  return `postgres [${driver}:${mode}] (target: ${masked || 'none'})`
}
