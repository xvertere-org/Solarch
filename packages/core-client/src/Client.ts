/**
 * @solarch/core-client - SolarchClient Kernel Entrypoint
 */

import type { FetchLike, WebSocketFactory } from './contracts/interfaces.js'
import type { RecordModel } from './contracts/types.js'
import {
  HttpClient,
  type AfterSendHook,
  type BeforeSendHook,
} from './http/HttpClient.js'
import { RealtimeService } from './realtime/RealtimeService.js'
import { CapabilityService } from './services/CapabilityService.js'
import { CollectionService } from './services/CollectionService.js'
import { FileService } from './services/FileService.js'
import { RecordService } from './services/RecordService.js'
import type { AuthStore } from './stores/AuthStore.js'
import { LocalAuthStore } from './stores/LocalAuthStore.js'
import { MemoryAuthStore } from './stores/MemoryAuthStore.js'
import { filter } from './utils/filter.js'

export interface SolarchClientOptions {
  /**
   * The base URL of the Solarch backend server (e.g. 'http://127.0.0.1:8090' or 'https://api.myapp.com').
   */
  baseUrl?: string

  /**
   * Custom AuthStore implementation.
   * If omitted: uses LocalAuthStore in browser runtimes, or MemoryAuthStore in headless/SSR/Node runtimes.
   */
  authStore?: AuthStore

  /**
   * Injected platform FetchLike implementation.
   * Defaults to global `fetch` if present.
   */
  fetch?: FetchLike

  /**
   * Injected platform WebSocketLike factory.
   * Defaults to global `WebSocket` if present.
   */
  wsFactory?: WebSocketFactory

  /**
   * Preferred realtime transport mode.
   * Defaults to 'auto' (WebSocket first, SSE fallback).
   */
  realtimeTransport?: 'ws' | 'sse' | 'auto'

  /**
   * Hook called immediately before sending an HTTP request.
   */
  beforeSend?: BeforeSendHook

  /**
   * Hook called immediately after receiving a successful HTTP response.
   */
  afterSend?: AfterSendHook
}

export class SolarchClient {
  readonly http: HttpClient
  readonly authStore: AuthStore
  readonly collections: CollectionService
  readonly files: FileService
  readonly realtime: RealtimeService
  readonly capabilities: CapabilityService

  private recordServices: Map<string, RecordService<any>> = new Map()

  constructor(
    baseUrl: string = '/',
    options: SolarchClientOptions = {}
  ) {
    const effectiveBaseUrl = options.baseUrl || baseUrl || '/'

    // Safe default AuthStore selection
    if (options.authStore) {
      this.authStore = options.authStore
    } else if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      this.authStore = new LocalAuthStore()
    } else {
      this.authStore = new MemoryAuthStore()
    }

    this.http = new HttpClient({
      baseUrl: effectiveBaseUrl,
      authStore: this.authStore,
      fetch: options.fetch,
      beforeSend: options.beforeSend,
      afterSend: options.afterSend,
    })

    this.collections = new CollectionService(this.http)
    this.files = new FileService(this.http)
    this.capabilities = new CapabilityService(this.http)

    this.realtime = new RealtimeService(this.http, {
      wsFactory: options.wsFactory,
      transport: options.realtimeTransport,
    })
  }

  get baseUrl(): string {
    return this.http.baseUrl
  }

  /**
   * Returns a typed RecordService instance for the specified collection ID or name.
   */
  collection<T extends RecordModel = RecordModel>(
    idOrName: string
  ): RecordService<T> {
    const key = idOrName.trim().toLowerCase()
    if (!this.recordServices.has(key)) {
      this.recordServices.set(
        key,
        new RecordService<T>(this.http, idOrName, this.realtime)
      )
    }
    return this.recordServices.get(key)! as RecordService<T>
  }

  /**
   * Utility helper to safely format filter query strings with escaped parameters.
   */
  filter(template: string, params: Record<string, any> = {}): string {
    return filter(template, params)
  }
}
