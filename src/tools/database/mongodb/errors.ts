import { DatabaseError, DatabaseErrorCode } from '../errors'

/**
 * Normalizes native MongoDB / BSON driver errors into canonical DatabaseError envelopes.
 * Guarantees raw MongoDB driver objects never leak to the application layer.
 */
export function normalizeMongoError(err: unknown): DatabaseError {
  if (err instanceof DatabaseError) {
    return err
  }

  const raw = err as any
  const code = raw?.code
  const message = raw?.message ?? 'Unknown MongoDB error'

  // Code 11000 / 11001: Duplicate Key Violation
  if (code === 11000 || code === 11001 || /E11000 duplicate key/i.test(message)) {
    const keyMatch = message.match(/index:\s+([^\s]+)\s+dup key:\s+\{\s*([^:]+):\s*([^}]+)\s*\}/i)
    const field = keyMatch ? keyMatch[2].trim() : 'id'
    return new DatabaseError(
      DatabaseErrorCode.DATABASE_CONSTRAINT,
      `Duplicate value violates unique constraint on field "${field}".`,
      {
        retryable: false,
        cause: err,
      },
    )
  }

  // Code 50 / ExceededTimeLimit: Query Timeout
  if (code === 50 || raw?.name === 'MongoServerSelectionError' || /timed out|timeout/i.test(message)) {
    return new DatabaseError(
      DatabaseErrorCode.DATABASE_TIMEOUT,
      `MongoDB query timed out: ${message}`,
      { retryable: true, cause: err },
    )
  }

  // Code 13: Unauthorized / Auth failed
  if (code === 13 || /auth failed|authentication failed/i.test(message)) {
    return new DatabaseError(
      DatabaseErrorCode.DATABASE_UNAVAILABLE,
      `MongoDB authentication failed. Check credentials.`,
      { retryable: false, cause: err },
    )
  }

  // Code 112 / WriteConflict: Transaction retryable conflict
  if (code === 112 || /write conflict/i.test(message)) {
    return new DatabaseError(
      DatabaseErrorCode.DATABASE_TRANSACTION_FAILED,
      `MongoDB transaction write conflict.`,
      { retryable: true, cause: err },
    )
  }

  // Connection errors
  if (raw?.name === 'MongoNetworkError' || /failed to connect|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return new DatabaseError(
      DatabaseErrorCode.DATABASE_UNAVAILABLE,
      `Failed to connect to MongoDB: ${message}`,
      { retryable: true, cause: err },
    )
  }

  return new DatabaseError(
    DatabaseErrorCode.DATABASE_UNAVAILABLE,
    message,
    { retryable: false, cause: err },
  )
}
