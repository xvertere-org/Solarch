/**
 * @solarch/core-client - Core Wire Types and Contracts
 */

export interface RecordModel {
  id: string
  collectionId?: string
  collectionName?: string
  created?: string
  updated?: string
  [key: string]: any
}

export interface AdminModel {
  id: string
  email: string
  created?: string
  updated?: string
  [key: string]: any
}

export type AuthModel = RecordModel | AdminModel | null

export interface ListResult<T extends RecordModel = RecordModel> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}

export interface PaginationParams {
  page?: number
  perPage?: number
  skipTotal?: boolean
}

export interface RecordOptions {
  expand?: string
  fields?: string
  [key: string]: any
}

export interface RecordListOptions extends RecordOptions, PaginationParams {
  filter?: string
  sort?: string
}

export interface RecordFullListOptions extends RecordOptions {
  filter?: string
  sort?: string
  batchSize?: number
  /**
   * Maximum number of items to safely fetch.
   * Default: 10,000. Set to Infinity or custom number if needed.
   */
  maxItems?: number
}

export interface FileOptions {
  thumb?: string
  download?: boolean
  token?: string
  [key: string]: any
}

export interface RealtimeEventPayload<T extends RecordModel = RecordModel> {
  action: 'create' | 'update' | 'delete'
  collectionId: string
  data: { id: string }
  timestamp: string
  record?: T
}

export type ApiErrorStatus =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export interface ApiErrorResponse {
  code: number
  status: ApiErrorStatus
  message: string
  data?: {
    fieldErrors?: Record<string, { code: string; message: string }>
    [key: string]: any
  }
}

export interface ServerHealthInfo {
  status?: string
  code?: number
  message?: string
  timestamp?: string
  data?: {
    dbConnected?: boolean
    [key: string]: any
  }
  [key: string]: any
}


export interface RecordAuthResponse<T extends RecordModel = RecordModel> {
  token: string
  record: T
  meta?: Record<string, any>
}

export interface AdminAuthResponse {
  token: string
  admin: AdminModel
}

export interface CollectionModel {
  id: string
  name: string
  type: 'base' | 'auth' | 'view'
  system?: boolean
  listRule?: string | null
  viewRule?: string | null
  createRule?: string | null
  updateRule?: string | null
  deleteRule?: string | null
  schema?: any[]
  fields?: any[]
  indexes?: string[]
  created?: string
  updated?: string
}

export interface HealthResponse {
  status: string
  version?: string
  database?: string
}
