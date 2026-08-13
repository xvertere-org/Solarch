/**
 * Canonical Wire Contract Types for Solarch Platform & Client SDKs.
 *
 * NOTE: These types represent the public over-the-wire JSON protocol.
 * They must NOT leak internal server classes (BaseApp, RecordModel, Collection),
 * database driver handles, Node.js, or Express-specific interfaces.
 */

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}

export type ApiErrorStatus =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'CAPABILITY_UNSUPPORTED'
  | 'INTERNAL_ERROR'

export interface ApiError {
  code: number
  status: ApiErrorStatus
  message: string
  errors?: Array<{ field: string; message: string; code?: string }>
  data?: {
    fieldErrors?: Record<string, { code: string; message: string }>
    retryAfter?: number
    [key: string]: any
  }
}

export interface AuthResponse<T = Record<string, any>> {
  token: string
  record: T
  meta?: Record<string, any>
}

export interface AdminAuthResponse {
  token: string
  admin: {
    id: string
    email: string
  }
}

export type RealtimeMessageType =
  | 'connected'
  | 'subscribe'
  | 'subscribed'
  | 'unsubscribe'
  | 'unsubscribed'
  | 'ping'
  | 'pong'
  | 'event'
  | 'error'

export interface RealtimeMessage<T = any> {
  type: RealtimeMessageType
  clientId?: string
  protocolVersion?: string
  authenticated?: boolean
  channels?: string[]
  channel?: string
  data?: T
  timestamp?: number | string
  message?: string
  code?: number
}

export interface RealtimeEventPayload<T = Record<string, any>> {
  action: 'create' | 'update' | 'delete'
  collectionId: string
  record: T
  timestamp: string
}

export interface FileReference {
  url: string
  tokenUrl?: string
  filename: string
}
