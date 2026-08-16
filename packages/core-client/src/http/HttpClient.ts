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
  /** Per-request timeout in milliseconds. Overrides the client-level timeout. */
  timeout?: number
  /** Per-request max retry attempts. Overrides the client-level maxRetries. */
  maxRetries?: number
  /**
   * If true, enables automatic retries for non-idempotent HTTP methods (POST, PATCH, PUT, DELETE).
   * Default: false (only idempotent GET and HEAD requests are automatically retried).
   */
  retryUnsafeMethods?: boolean
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
  /**
   * Request timeout in milliseconds. Default: 30000 (30 seconds).
   * Set to 0 to disable automatic timeout.
   */
  timeout?: number
  /**
   * Maximum number of retry attempts for retryable errors (network errors, 5xx, 429).
   * Default: 3. Set to 0 to disable retries.
   * Note: By default, only idempotent methods (GET, HEAD) are retried.
   * Non-idempotent methods require `retryUnsafeMethods: true` in SendOptions.
   */
  maxRetries?: number
}

export class HttpClient {
  baseUrl: string
  authStore: AuthStore
  customFetch?: FetchLike
  beforeSend?: BeforeSendHook
  afterSend?: AfterSendHook
  timeout: number
  maxRetries: number

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl || '/').replace(/\/+$/, '')
    this.authStore = options.authStore || new MemoryAuthStore()
    this.customFetch = options.fetch
    this.beforeSend = options.beforeSend
    this.afterSend = options.afterSend
    this.timeout = options.timeout ?? 30_000
    this.maxRetries = options.maxRetries ?? 3
  }

  private getFetch(): FetchLike {
    if (this.customFetch) {
      return this.customFetch
    }
    if (typeof fetch === 'function') {
      return fetch as unknown as FetchLike
    }
    throw new ClientResponseError({
      statusCode: 0,
      status: 'INTERNAL_ERROR',
      message: 'No global fetch found. Please provide a custom FetchLike implementation in HttpClientOptions.',
    })
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

    const method = (currentOptions.method || init.method || 'GET').toUpperCase()
    const isIdempotent = method === 'GET' || method === 'HEAD'
    const canRetryMethod = isIdempotent || !!currentOptions.retryUnsafeMethods

    const maxRetries = currentOptions.maxRetries ?? this.maxRetries
    const timeout = currentOptions.timeout ?? this.timeout
    let lastError: ClientResponseError | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Wait before retrying (not on first attempt)
      if (attempt > 0 && lastError) {
        const delay = this.calculateRetryDelay(attempt, lastError)
        await this.sleep(delay)
      }

      let response: FetchResponseLike
      try {
        const fetchFn = this.getFetch()
        response = await this.fetchWithTimeout(fetchFn, url, init, timeout, currentOptions.signal)
      } catch (err: any) {
        if (err && (err.isUserAbort || ((err.name === 'AbortError' || err.code === 20) && !err.isTimeout))) {
          // Genuine user-initiated abort — do not retry
          throw ClientResponseError.fromAbort(err)
        }
        lastError = new ClientResponseError({
          statusCode: 0,
          status: 'INTERNAL_ERROR',
          message: err.message || 'Failed to send request.',
          originalError: err,
        })
        // Network error / timeout — only retry if method is allowed
        if (canRetryMethod && attempt < maxRetries) continue
        throw lastError
      }

      // Check for retryable HTTP statuses (429, 5xx)
      if (response.status === 429 || response.status >= 500) {
        let data: any = null
        try {
          if (response.headers && typeof response.headers.get === 'function') {
            const ct = (response.headers.get('content-type') || '').toLowerCase()
            if (ct.includes('application/json') && typeof response.json === 'function') {
              data = await response.json()
            }
          }
        } catch { /* ignore parse errors for retry logic */ }

        lastError = ClientResponseError.fromApiResponse(response, data)

        // Extract Retry-After for 429
        if (response.status === 429) {
          (lastError as any)._retryAfterHeader = response.headers?.get?.('retry-after') || null
        }

        // Only retry if method is allowed
        if (canRetryMethod && attempt < maxRetries) continue
        throw lastError
      }

      // Non-retryable response — parse and return
      let data = await parseHttpResponse<T>(response)

      if (this.afterSend) {
        data = await this.afterSend(response, data)
      }

      return data
    }

    // Should not reach here, but safety net
    throw lastError || new ClientResponseError({
      statusCode: 0,
      status: 'INTERNAL_ERROR',
      message: 'Request failed after all retry attempts.',
    })
  }

  /**
   * Calculates the retry delay in milliseconds using exponential backoff with jitter.
   * For 429 responses, respects the Retry-After header if present (without jitter).
   */
  calculateRetryDelay(attempt: number, error: ClientResponseError): number {
    // Check for Retry-After header on 429 responses
    const retryAfterHeader = (error as any)._retryAfterHeader
    if (retryAfterHeader) {
      const retryAfterSec = Number(retryAfterHeader)
      if (!isNaN(retryAfterSec) && retryAfterSec > 0) {
        // Cap at 60 seconds to prevent abuse — respect Retry-After as-is
        return Math.min(retryAfterSec * 1000, 60_000)
      }
    }

    // Exponential backoff with jitter: [exponential, 1.5 * exponential]
    const baseDelay = 200
    const exponential = baseDelay * Math.pow(2, attempt - 1)
    const jitter = Math.random() * exponential * 0.5
    return exponential + jitter
  }

  /**
   * Wraps fetch with an automatic timeout via AbortController, distinguishing internal timeouts from user aborts.
   */
  private async fetchWithTimeout(
    fetchFn: FetchLike,
    url: string,
    init: any,
    timeout: number,
    userSignal?: any
  ): Promise<FetchResponseLike> {
    // If timeout is 0 or user provided their own signal, skip automatic timeout
    if (timeout <= 0) {
      return fetchFn(url, { ...init, signal: userSignal || init.signal })
    }

    const controller = new AbortController()
    let timedOut = false
    let userAborted = false

    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeout)

    // If user provided a signal, listen for their abort
    if (userSignal && typeof userSignal.addEventListener === 'function') {
      if (userSignal.aborted) {
        userAborted = true
        controller.abort()
      } else {
        userSignal.addEventListener('abort', () => {
          userAborted = true
          controller.abort()
        }, { once: true })
      }
    }

    try {
      const response = await fetchFn(url, { ...init, signal: controller.signal })
      return response
    } catch (err: any) {
      if (timedOut) {
        const timeoutErr = new Error(`Request timed out after ${timeout}ms`)
        ;(timeoutErr as any).isTimeout = true
        throw timeoutErr
      }
      if (userAborted || (userSignal && userSignal.aborted)) {
        const abortErr = err || new Error('The operation was aborted.')
        ;(abortErr as any).isUserAbort = true
        throw abortErr
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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

