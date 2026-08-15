/**
 * @solarch/core-client - Platform Abstraction Interfaces (FetchLike, WebSocketLike)
 */

export interface HeadersLike {
  get(name: string): string | null
  set?(name: string, value: string): void
  has?(name: string): boolean
  forEach?(callback: (value: string, key: string) => void): void
  [key: string]: any
}

export interface AbortSignalLike {
  readonly aborted: boolean
  addEventListener?(type: 'abort', listener: () => void): void
  removeEventListener?(type: 'abort', listener: () => void): void
  [key: string]: any
}

export interface FetchRequestInit {
  method?: string
  headers?: Record<string, string> | HeadersLike | [string, string][]
  body?: any
  signal?: AbortSignalLike | null
  credentials?: string
  mode?: string
  cache?: string
  [key: string]: any
}

export interface FetchResponseLike {
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly headers: HeadersLike
  json(): Promise<any>
  text(): Promise<string>
  blob?(): Promise<any>
  [key: string]: any
}

export type FetchLike = (
  input: string | URL,
  init?: FetchRequestInit
) => Promise<FetchResponseLike>

export interface WebSocketLike {
  readonly readyState: number
  onopen: ((event: any) => void) | null
  onclose: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onmessage: ((event: { data: any }) => void) | null
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void
  close(code?: number, reason?: string): void
  [key: string]: any
}

export type WebSocketFactory = (
  url: string,
  protocols?: string | string[]
) => WebSocketLike
