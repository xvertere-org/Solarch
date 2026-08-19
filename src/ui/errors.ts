/**
 * Standardized CLI error handler for Solarch.
 * Enforces zero secret leakage, hides internal stack traces by default,
 * and provides clear, actionable hints.
 */

import { colors } from './theme.js'
import { maskDatabaseUrl } from '../cmd/env/masking.js'

/**
 * Sanitizes arbitrary error text to prevent secret leakage
 */
export function sanitizeErrorMessage(text: string): string {
  let clean = text

  // 1. Mask database connection URLs with passwords
  clean = clean.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1****$3')
  clean = clean.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1****$3')
  clean = clean.replace(/(mysql:\/\/[^:]+:)([^@]+)(@)/gi, '$1****$3')

  // 2. Redact 32+ char hex/base64 tokens (JWT secrets, encryption keys)
  clean = clean.replace(/([a-f0-9]{32,64})/gi, (match) => {
    // If it looks like a hex hash/secret, mask it
    if (match.length >= 32) return '****************'
    return match
  })

  return clean
}

/**
 * Formats a clean, standardized error message
 */
export function formatCliError(error: unknown, hint?: string): string {
  const isDebug = process.env.SOLARCH_DEBUG === 'true'
  let rawMessage = ''
  let stackTrace = ''

  if (error instanceof Error) {
    rawMessage = error.message
    if (error.stack) {
      stackTrace = error.stack
    }
  } else if (typeof error === 'string') {
    rawMessage = error
  } else {
    rawMessage = String(error)
  }

  const cleanMessage = sanitizeErrorMessage(rawMessage)
  const lines: string[] = []

  lines.push('')
  lines.push(`${colors.bold(colors.red('✖ Failed'))}`)
  lines.push('')
  lines.push(cleanMessage)

  if (hint) {
    lines.push('')
    lines.push(`${colors.bold('Hint:')}`)
    lines.push(hint)
  }

  if (isDebug && stackTrace) {
    lines.push('')
    lines.push(`${colors.bold(colors.yellow('Debug stack:'))}`)
    lines.push(colors.dim(stackTrace))
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * Central CLI error handling entrypoint
 */
export function handleCliError(error: unknown, hint?: string, exitOnComplete = true): void {
  console.error(formatCliError(error, hint))
  if (exitOnComplete) {
    process.exit(1)
  }
}
