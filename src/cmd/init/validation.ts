/**
 * Solarch CLI Init Pre-flight Validation Engine
 * Enforces sanitization, path security, protocol rules, and provider invariants.
 */

import { VALID_DATABASES, VALID_AUTH_PROVIDERS } from './defaults'

/**
 * Validates project name against path traversal, separators, and special characters.
 */
export function validateProjectName(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) {
    throw new Error('Project name cannot be empty.')
  }
  if (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    trimmed === '.' ||
    trimmed === '..'
  ) {
    throw new Error(
      `Invalid project name "${trimmed}". Must be a single path component without path separators or traversal characters.`
    )
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
    throw new Error(
      `Invalid project name "${trimmed}". Project name may only contain alphanumeric characters, hyphens, underscores, and dots.`
    )
  }
  return trimmed
}

/**
 * Validates database provider against supported scaffolding engines.
 */
export function validateDatabase(db: string): 'sqlite' | 'postgres' | 'mongodb' {
  const normalized = (db || '').trim().toLowerCase()
  if (!VALID_DATABASES.includes(normalized as any)) {
    throw new Error(
      `Invalid database provider "${db}". Supported: ${VALID_DATABASES.join(', ')}.`
    )
  }
  return normalized as 'sqlite' | 'postgres' | 'mongodb'
}

/**
 * Validates connection URL protocol for PostgreSQL if provided or required.
 */
export function validateDatabaseUrl(dbType: string, url?: string, required: boolean = false): string {
  if (dbType !== 'postgres') return ''
  const trimmed = (url || '').trim()
  if (!trimmed) {
    if (required) {
      throw new Error(
        'PostgreSQL requires a non-empty DATABASE_URL (e.g. postgres://user:pass@localhost:5432/dbname).'
      )
    }
    return ''
  }
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    throw new Error(
      `Invalid PostgreSQL DATABASE_URL "${trimmed}". Must begin with "postgres://" or "postgresql://".`
    )
  }
  return trimmed
}

/**
 * Validates list of auth providers against supported adapters.
 */
export function validateAuthProviders(providersInput?: string | string[]): string[] {
  if (!providersInput) {
    return ['email']
  }
  let list: string[]
  if (Array.isArray(providersInput)) {
    list = providersInput.map(s => String(s).trim().toLowerCase()).filter(Boolean)
  } else {
    list = String(providersInput)
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  }
  if (list.length === 0) {
    return ['email']
  }
  for (const p of list) {
    if (!VALID_AUTH_PROVIDERS.includes(p as any)) {
      throw new Error(
        `Invalid auth provider "${p}". Supported providers: ${VALID_AUTH_PROVIDERS.join(', ')}.`
      )
    }
  }
  return Array.from(new Set(list))
}

/**
 * Parses user input or CLI option into a strict boolean value.
 */
export function parseBoolean(
  val: boolean | string | undefined,
  defaultVal: boolean,
  fieldName: string
): boolean {
  if (val === undefined || val === null) return defaultVal
  if (typeof val === 'boolean') return val
  const s = String(val).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'y' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'n' || s === 'no') return false
  throw new Error(
    `Invalid value for --${fieldName}: "${val}". Expected "true" or "false".`
  )
}
