import { ApiError, ApiErrorStatus } from '../core/contracts/api_contracts'
import { Response } from 'express'

export function createApiError(
  code: number,
  status: ApiErrorStatus,
  message: string,
  data?: Record<string, any>
): ApiError {
  const error: ApiError = {
    code,
    status,
    message,
  }
  if (data !== undefined) {
    error.data = data
  }
  return error
}

export function sendApiError(res: Response, error: ApiError): Response {
  return res.status(error.code).json(error)
}

export function normalizeDatabaseError(err: any): ApiError {
  const message = err?.message || String(err)
  const code = err?.code

  // SQLite and PostgreSQL unique constraint checks
  const isUniqueConstraint =
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    code === '23505' ||
    message.includes('UNIQUE constraint failed') ||
    message.includes('duplicate key value') ||
    message.includes('violates unique constraint')

  if (isUniqueConstraint) {
    const errObj = createApiError(
      400,
      'VALIDATION_FAILED',
      'Validation failed.',
      {
        fieldErrors: {
          email: {
            code: 'validation_not_unique',
            message: 'Value must be unique.',
          },
          general: {
            code: 'validation_not_unique',
            message: 'Value must be unique.',
          },
        },
      }
    )
    errObj.errors = [{ field: 'email', message: 'Value must be unique.', code: 'validation_not_unique' }]
    return errObj
  }

  // Foreign key violations
  const isForeignKeyViolation =
    code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
    code === '23503' ||
    message.includes('FOREIGN KEY constraint failed') ||
    message.includes('violates foreign key constraint')

  if (isForeignKeyViolation) {
    const errObj = createApiError(
      400,
      'VALIDATION_FAILED',
      'Foreign key constraint violation.',
      {
        fieldErrors: {
          general: {
            code: 'validation_foreign_key',
            message: 'Referenced record does not exist.',
          },
        },
      }
    )
    errObj.errors = [{ field: 'general', message: 'Referenced record does not exist.', code: 'validation_foreign_key' }]
    return errObj
  }

  return createApiError(
    500,
    'DATABASE_ERROR',
    'Internal database error occurred.'
  )
}
