export enum DatabaseErrorCode {
  DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  DATABASE_CONSTRAINT = 'DATABASE_CONSTRAINT',
  DATABASE_TRANSACTION_FAILED = 'DATABASE_TRANSACTION_FAILED',
  DATABASE_SCHEMA_ERROR = 'DATABASE_SCHEMA_ERROR',
  DATABASE_PERMISSION_DENIED = 'DATABASE_PERMISSION_DENIED',
  DATABASE_INVALID_QUERY = 'DATABASE_INVALID_QUERY',
  DATABASE_CAPABILITY_UNSUPPORTED = 'DATABASE_CAPABILITY_UNSUPPORTED',
}

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode
  readonly retryable: boolean
  readonly cause?: unknown

  constructor(code: DatabaseErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
    this.retryable = options?.retryable ?? false
    this.cause = options?.cause
  }
}

const RETRYABLE_CODES = new Set([
  DatabaseErrorCode.DATABASE_UNAVAILABLE,
  DatabaseErrorCode.DATABASE_TIMEOUT,
  DatabaseErrorCode.DATABASE_TRANSACTION_FAILED,
])

export function isRetryableDatabaseError(err: unknown): boolean {
  return err instanceof DatabaseError && RETRYABLE_CODES.has(err.code)
}

const CONSTRAINT_CODES = new Set([
  'SQLITE_CONSTRAINT',
  'SQLITE_CONSTRAINT_PRIMARYKEY',
  'SQLITE_CONSTRAINT_UNIQUE',
  'SQLITE_CONSTRAINT_CHECK',
  'SQLITE_CONSTRAINT_FOREIGNKEY',
  'SQLITE_CONSTRAINT_NOTNULL',
])

export function isConstraintError(err: unknown): boolean {
  if (err instanceof DatabaseError) return err.code === DatabaseErrorCode.DATABASE_CONSTRAINT
  if (err instanceof Error && 'code' in err && typeof (err as any).code === 'string') {
    return CONSTRAINT_CODES.has((err as any).code)
  }
  return false
}