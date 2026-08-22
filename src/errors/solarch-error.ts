/**
 * Solarch CLI — Structured SolarchError Class
 *
 * Provides actionable error messages with developer suggestions, docs links, and exit codes.
 */

import { SolarchErrorCodeType, SolarchErrorCode } from './codes.js'

export interface SolarchErrorOptions {
  code: SolarchErrorCodeType
  message: string
  suggestion?: string
  docsUrl?: string
  exitCode?: number
  cause?: Error | unknown
}

export class SolarchError extends Error {
  public readonly code: SolarchErrorCodeType
  public readonly suggestion?: string
  public readonly docsUrl?: string
  public readonly exitCode: number
  public readonly cause?: Error | unknown

  constructor(options: SolarchErrorOptions) {
    super(options.message)
    this.name = 'SolarchError'
    this.code = options.code
    this.suggestion = options.suggestion
    this.docsUrl = options.docsUrl || `https://solarch.in/docs/errors#${options.code.toLowerCase()}`
    this.exitCode = options.exitCode ?? 1
    this.cause = options.cause

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SolarchError)
    }
  }

  // Pre-configured factory helpers
  public static authRequired(message: string = 'Authentication required to perform this action.'): SolarchError {
    return new SolarchError({
      code: SolarchErrorCode.AUTH_REQUIRED,
      message,
      suggestion: 'Run "solarch login" to authenticate with Solarch Platform.',
    })
  }

  public static projectNotFound(dir: string = process.cwd()): SolarchError {
    return new SolarchError({
      code: SolarchErrorCode.PROJECT_NOT_FOUND,
      message: `No Solarch project manifest found at "${dir}".`,
      suggestion: 'Run "solarch init" to create a new Solarch project in this directory.',
    })
  }

  public static configConflict(field: string): SolarchError {
    return new SolarchError({
      code: SolarchErrorCode.CONFIG_CONFLICT,
      message: `Reconciliation conflict detected on field "${field}".`,
      suggestion: 'Run "solarch project diff" to review differences or resolve manually.',
    })
  }

  public static mcpApprovalRequired(toolName: string, impact: string): SolarchError {
    return new SolarchError({
      code: SolarchErrorCode.MCP_APPROVAL_REQUIRED,
      message: `Tool "${toolName}" requires explicit developer authorization.`,
      suggestion: `Review the action (${impact}) and re-run with approval authorization.`,
    })
  }
}
