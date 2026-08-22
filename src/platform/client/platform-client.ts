/**
 * Solarch CLI Platform API Client (Phase 2)
 *
 * Base HTTP client for communicating with the Solarch Platform API.
 */

import { PlatformConfig } from '../config.js'

export interface RequestOptions {
  token?: string
  timeoutMs?: number
  headers?: Record<string, string>
}

export class PlatformClient {
  protected config: PlatformConfig

  constructor(config: PlatformConfig = PlatformConfig.default()) {
    this.config = config
  }

  public getConfig(): PlatformConfig {
    return this.config
  }

  public async request<T = unknown>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.config.apiBaseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`

    const headers: Record<string, string> = {
      'User-Agent': 'solarch-cli/0.19.8',
      ...options.headers,
    }

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`
    }

    if (body !== undefined && typeof body === 'object') {
      headers['Content-Type'] = 'application/json'
    }

    const timeout = options.timeoutMs ?? this.config.timeoutMs
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: response.statusText }
        }
        const message =
          errorData?.message || errorData?.error || `Request failed with status ${response.status}`
        throw new Error(message)
      }

      if (response.status === 204) {
        return {} as T
      }

      return (await response.json()) as T
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Platform request timed out after ${timeout}ms.`)
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  public async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, options)
  }

  public async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, 'POST', body, options)
  }

  public async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, 'PUT', body, options)
  }

  public async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', body, options)
  }

  public async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, options)
  }
}
