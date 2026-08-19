import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { sanitizeErrorMessage, formatCliError } from '../errors'

describe('Standardized Error Handling', () => {
  const originalEnv = process.env.SOLARCH_DEBUG

  afterEach(() => {
    process.env.SOLARCH_DEBUG = originalEnv
  })

  it('1. removes database passwords from error messages', () => {
    const rawError = 'Connection failed: postgres://admin:SuperSecretPass123@localhost:5432/mydb'
    const sanitized = sanitizeErrorMessage(rawError)
    expect(sanitized).not.toContain('SuperSecretPass123')
    expect(sanitized).toContain('postgres://admin:****@localhost:5432/mydb')
  })

  it('2. removes raw 32+ character hex secrets', () => {
    const rawSecret = '4f8b9a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90'
    const rawError = `Invalid token verification: ${rawSecret}`
    const sanitized = sanitizeErrorMessage(rawError)
    expect(sanitized).not.toContain(rawSecret)
    expect(sanitized).toContain('****************')
  })

  it('3. hides stack trace in default mode', () => {
    delete process.env.SOLARCH_DEBUG
    const error = new Error('Database connection failed')
    const formatted = formatCliError(error, 'Check DATABASE_URL')

    expect(formatted).toContain('✖ Failed')
    expect(formatted).toContain('Database connection failed')
    expect(formatted).toContain('Hint:')
    expect(formatted).toContain('Check DATABASE_URL')
    expect(formatted).not.toContain('Debug stack:')
  })

  it('4. displays stack trace when SOLARCH_DEBUG=true', () => {
    process.env.SOLARCH_DEBUG = 'true'
    const error = new Error('Database connection failed')
    const formatted = formatCliError(error, 'Check DATABASE_URL')

    expect(formatted).toContain('✖ Failed')
    expect(formatted).toContain('Debug stack:')
    expect(formatted).toContain('Error: Database connection failed')
  })
})
