import { DatabaseError, DatabaseErrorCode } from '../errors'

const PG_CODE_MAP: Record<string, { code: DatabaseErrorCode; retryable?: boolean }> = {
  '23505': { code: DatabaseErrorCode.DATABASE_CONSTRAINT }, // unique_violation
  '23503': { code: DatabaseErrorCode.DATABASE_CONSTRAINT }, // foreign_key_violation
  '23514': { code: DatabaseErrorCode.DATABASE_CONSTRAINT }, // check_violation
  '23502': { code: DatabaseErrorCode.DATABASE_CONSTRAINT }, // not_null_violation
  '42P01': { code: DatabaseErrorCode.DATABASE_SCHEMA_ERROR }, // undefined_table
  '42703': { code: DatabaseErrorCode.DATABASE_SCHEMA_ERROR }, // undefined_column
  '42601': { code: DatabaseErrorCode.DATABASE_INVALID_QUERY }, // syntax_error
  '42501': { code: DatabaseErrorCode.DATABASE_PERMISSION_DENIED }, // insufficient_privilege
  '08006': { code: DatabaseErrorCode.DATABASE_UNAVAILABLE, retryable: true }, // connection_failure
  '08001': { code: DatabaseErrorCode.DATABASE_UNAVAILABLE, retryable: true }, // sqlclient_unable_to_establish_sqlconnection
  '53300': { code: DatabaseErrorCode.DATABASE_UNAVAILABLE, retryable: true }, // too_many_connections
  '57014': { code: DatabaseErrorCode.DATABASE_TIMEOUT, retryable: true }, // query_canceled
  '40P01': { code: DatabaseErrorCode.DATABASE_TRANSACTION_FAILED, retryable: true }, // deadlock_detected
  '40001': { code: DatabaseErrorCode.DATABASE_TRANSACTION_FAILED, retryable: true }, // serialization_failure
  '25P02': { code: DatabaseErrorCode.DATABASE_TRANSACTION_FAILED }, // in_failed_sql_transaction
}

export function mapPgError(err: unknown, operation: string): DatabaseError {
  if (err instanceof DatabaseError) return err

  const message = err instanceof Error ? err.message : String(err)
  const code = (err as { code?: string } | null)?.code

  if (code && code in PG_CODE_MAP) {
    const mapped = PG_CODE_MAP[code]
    return new DatabaseError(mapped.code, `${operation}: ${message}`, {
      retryable: mapped.retryable ?? false,
      cause: err,
    })
  }

  if (message.toLowerCase().includes('timeout')) {
    return new DatabaseError(DatabaseErrorCode.DATABASE_TIMEOUT, `${operation}: ${message}`, {
      retryable: true,
      cause: err,
    })
  }

  if (message.includes('Connection terminated') || message.includes('ECONNREFUSED')) {
    return new DatabaseError(DatabaseErrorCode.DATABASE_UNAVAILABLE, `${operation}: ${message}`, {
      retryable: true,
      cause: err,
    })
  }

  return new DatabaseError(DatabaseErrorCode.DATABASE_INVALID_QUERY, `${operation}: ${message}`, { cause: err })
}