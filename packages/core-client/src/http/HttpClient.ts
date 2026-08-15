/**
 * @solarch/core-client - Platform-Neutral HTTP Client
 */

import { ClientResponseError } from '../contracts/errors.js'
import type {
  FetchLike,
  FetchRequestInit,
  FetchResponseLike,
} from '../contracts/interfaces.js'
import type { AuthStore } from '../stores/AuthStore.js'
import { MemoryAuthStore } from '../stores/MemoryAuthStore.js'

export interface SendOptions {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: any
  signal?: any
  [key: string]: any
}

export type BeforeSendHook = (
  url: string,
  options: SendOptions
) => Promise<SendOptions | void> | SendOptions | void

export type AfterSendHook = (
  response: FetchResponseLike,
  data: any
) => Promise<any> | any

export interface HttpClientOptions {
  baseUrl?: string
  authStore?: AuthStore
  fetch?: FetchLike
  beforeSend?: BeforeSendHook
  afterSend?: AfterSendHook
}

export class HttpClient {
  baseUrl: string
  authStore: AuthStore
  customFetch?: FetchLike
  beforeSend?: BeforeSendHook
  afterSend?: AfterSendHook

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl || '/').replace(/\/+$/, '')
    this.authStore = options.authStore || new MemoryAuthStore()
    this.customFetch = options.fetch
    this.beforeSend = options.beforeSend
    this.afterSend = options.afterSend
  }

  private getFetch(): FetchLike {
    if (this.customFetch) {
      return this.customFetch
    }
    if (typeof fetch === 'function') {
      return fetch as unknown as FetchLike
    }
    throw new Error(
      'No global fetch found. Please provide a custom FetchLike implementation in HttpClientOptions.'
    )
  }

  buildUrl(path: string, queryParams?: Record<string, any>): string {
    let url = path
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      url = `${this.baseUrl}${cleanPath}`
    }

    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === undefined || value === null) continue
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item !== undefined && item !== null) {
              params.append(key, String(item))
            }
          }
        } else {
          params.set(key, String(value))
        }
      }
      const queryString = params.toString()
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString
      }
    }

    return url
  }

  async send<T = any>(path: string, options: SendOptions = {}): Promise<T> {
    let currentOptions: SendOptions = { ...options }

    if (this.beforeSend) {
      const result = await this.beforeSend(path, currentOptions)
      if (result) {
        currentOptions = result
      }
    }

    const url = this.buildUrl(path, currentOptions.query)
    const method = (currentOptions.method || 'GET').toUpperCase()

    const headers: Record<string, string> = {
      'X-Solarch-Protocol': '1.0',
      ...(currentOptions.headers || {}),
    }

    const token = this.authStore.getToken()
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let body = currentOptions.body

    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData

    if (body !== undefined && body !== null && !isFormData) {
      if (typeof body === 'object') {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json'
        }
        body = JSON.stringify(body)
      }
    }

    const fetchInit: FetchRequestInit = {
      method,
      headers,
      body,
      signal: currentOptions.signal,
    }

    let response: FetchResponseLike
    try {
      const fetchFn = this.getFetch()
      response = await fetchFn(url, fetchInit)
    } catch (err: any) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        throw ClientResponseError.fromAbort(err)
      }
      throw new ClientResponseError({
        statusCode: 0,
        status: 'INTERNAL_ERROR',
        message: err.message || 'Failed to send request.',
        originalError: err,
      })
    }

    if (response.status === 204) {
      return (null as unknown) as T
    }

    let data: any
    const contentType = response.headers?.get ? response.headers.get('content-type') : ''
    const isJson = contentType && contentType.includes('application/json')

    try {
      if (isJson || typeof response.json === 'function') {
        data = await response.json()
      } else {
        data = await response.text()
      }
    } catch (err) {
      data = null
    }

    if (!response.ok) {
      throw ClientResponseError.fromApiResponse(response, data)
    }

    if (this.afterSend) {
      data = await this.afterSend(response, data)
    }

    return data as T
  }

  get<T = any>(path: string, options?: SendOptions): Promise<T> {
    return this.send<T>(path, { ...options, method: 'GET' })
  }

  post<T = any>(path: string, options?: SendOptions): Promise<T> {
    return this.send<T>(path, { ...options, method: 'POST' })
  }

  patch<T = any>(path: string, options?: SendOptions): Promise<T> {
    return this.send<T>(path, { ...options, method: 'PATCH' })
  }

  put<T = any>(path: string, options?: SendOptions): Promise<T> {
    return this.send<T>(path, { ...options, method: 'PUT' })
  }

  delete<T = any>(path: string, options?: SendOptions): Promise<T> {
    return this.send<T>(path, { ...options, method: 'DELETE' })
  }
}
