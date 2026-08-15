/**
 * @solarch/core-client - Client Response Error Hierarchy
 */

import type { ApiErrorResponse, ApiErrorStatus } from './types.js'

export interface ClientResponseErrorOptions {
  statusCode?: number
  status?: ApiErrorStatus
  message?: string
  data?: Record<string, any>
  isAbort?: boolean
  originalError?: any
}

export class ClientResponseError extends Error {
  readonly statusCode: number
  readonly status: ApiErrorStatus
  readonly data: Record<string, any>
  readonly isAbort: boolean
  readonly originalError?: any

  constructor(options: ClientResponseErrorOptions = {}) {
    super(options.message || 'Something went wrong while processing the request.')
    this.name = 'ClientResponseError'
    this.statusCode = options.statusCode ?? 0
    this.status = options.status ?? (this.statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST')
    this.data = options.data || {}
    this.isAbort = !!options.isAbort
    this.originalError = options.originalError

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ClientResponseError.prototype)
  }

  static fromApiResponse(
    res: { status: number; statusText: string },
    body: ApiErrorResponse | any
  ): ClientResponseError {
    const isErrorEnvelope = body && typeof body === 'object' && ('status' in body || 'code' in body)

    const statusCode = isErrorEnvelope && typeof body.code === 'number' ? body.code : res.status
    const status: ApiErrorStatus =
      isErrorEnvelope && typeof body.status === 'string'
        ? (body.status as ApiErrorStatus)
        : statusCode === 400
          ? 'VALIDATION_FAILED'
          : statusCode === 401
            ? 'UNAUTHORIZED'
            : statusCode === 403
              ? 'FORBIDDEN'
              : statusCode === 404
                ? 'NOT_FOUND'
                : statusCode === 429
                  ? 'RATE_LIMITED'
                  : 'INTERNAL_ERROR'

    const message =
      isErrorEnvelope && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : `Request failed with status ${statusCode}: ${res.statusText}`

    const data = isErrorEnvelope && body.data && typeof body.data === 'object' ? body.data : {}

    return new ClientResponseError({
      statusCode,
      status,
      message,
      data,
    })
  }

  static fromAbort(originalError?: any): ClientResponseError {
    return new ClientResponseError({
      statusCode: 0,
      status: 'BAD_REQUEST',
      message: 'The request was aborted.',
      isAbort: true,
      originalError,
    })
  }

  isValidationFailed(): boolean {
    return this.status === 'VALIDATION_FAILED' || this.statusCode === 400
  }

  isUnauthorized(): boolean {
    return this.status === 'UNAUTHORIZED' || this.statusCode === 401
  }

  isForbidden(): boolean {
    return this.status === 'FORBIDDEN' || this.statusCode === 403
  }

  isNotFound(): boolean {
    return this.status === 'NOT_FOUND' || this.statusCode === 404
  }

  isRateLimited(): boolean {
    return this.status === 'RATE_LIMITED' || this.statusCode === 429
  }

  isInternalError(): boolean {
    return this.status === 'INTERNAL_ERROR' || this.statusCode >= 500
  }

  getFieldErrors(): Record<string, { code: string; message: string }> {
    if (this.data && typeof this.data.fieldErrors === 'object' && this.data.fieldErrors !== null) {
      return this.data.fieldErrors
    }
    return {}
  }
}

/**
 * Canonical error parser for Solarch API responses
 */
export function parseApiError(
  res: { status: number; statusText: string } | any,
  body?: ApiErrorResponse | any
): ClientResponseError {
  if (res instanceof ClientResponseError) {
    return res
  }
  if (res && typeof res.status === 'number') {
    return ClientResponseError.fromApiResponse(res, body)
  }
  if (res && res.name === 'AbortError') {
    return ClientResponseError.fromAbort(res)
  }
  return new ClientResponseError({
    statusCode: 0,
    status: 'INTERNAL_ERROR',
    message: (res && res.message) || 'Network or unexpected client error.',
    originalError: res,
  })
}

