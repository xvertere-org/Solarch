/**
 * @solarch/core-client - Platform-Neutral HTTP Client
 */

import { ClientResponseError } from '../contracts/errors.js'
import type {
  FetchLike,
  FetchResponseLike,
} from '../contracts/interfaces.js'
import type { AuthStore } from '../stores/AuthStore.js'
import { MemoryAuthStore } from '../stores/MemoryAuthStore.js'
import { prepareRequest } from './request.js'
import { serializeQueryParams } from './serializer.js'
import { parseHttpResponse } from './response.js'

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

    const queryStr = serializeQueryParams(queryParams)
    if (queryStr) {
      url += (url.includes('?') ? '&' : '') + (queryStr.startsWith('?') && url.includes('?') ? queryStr.slice(1) : queryStr)
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
    const token = this.authStore.getToken()
    const { init } = prepareRequest({
      ...currentOptions,
      token,
    })

    let response: FetchResponseLike
    try {
      const fetchFn = this.getFetch()
      response = await fetchFn(url, init)
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

    let data = await parseHttpResponse<T>(response)

    if (this.afterSend) {
      data = await this.afterSend(response, data)
    }

    return data
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
