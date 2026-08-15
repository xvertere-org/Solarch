/**
 * @solarch/core-client - RecordService<T>
 */

import { ClientResponseError } from '../contracts/errors.js'
import type {
  ListResult,
  RealtimeEventPayload,
  RecordAuthResponse,
  RecordFullListOptions,
  RecordListOptions,
  RecordModel,
  RecordOptions,
} from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export interface RealtimeSubscriptionOptions {
  autoFetch?: boolean
}

export interface RealtimeSubscriber<T extends RecordModel = RecordModel> {
  (event: RealtimeEventPayload<T>): void
}

export interface RealtimeClientProvider {
  subscribe(
    topic: string,
    callback: (data: any) => void
  ): Promise<() => void>
  unsubscribe(topic?: string): Promise<void>
}

export class RecordService<T extends RecordModel = RecordModel> {
  constructor(
    readonly client: HttpClient,
    readonly collectionIdOrName: string,
    readonly realtimeProvider?: RealtimeClientProvider
  ) {}

  protected get basePath(): string {
    return `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/records`
  }

  async getList(
    page: number = 1,
    perPage: number = 30,
    options: RecordListOptions = {}
  ): Promise<ListResult<T>> {
    return this.client.get<ListResult<T>>(this.basePath, {
      query: {
        page,
        perPage,
        ...options,
      },
    })
  }

  async getFullList(options: RecordFullListOptions = {}): Promise<T[]> {
    const batchSize = options.batchSize || 100
    const result: T[] = []
    let page = 1

    while (true) {
      const list = await this.getList(page, batchSize, options)
      result.push(...list.items)
      if (list.items.length < batchSize || result.length >= list.totalItems) {
        break
      }
      page++
    }

    return result
  }

  async getFirstListItem(
    filter: string,
    options: RecordOptions = {}
  ): Promise<T> {
    const list = await this.getList(1, 1, { ...options, filter })
    if (!list.items || list.items.length === 0) {
      throw new ClientResponseError({
        statusCode: 404,
        status: 'NOT_FOUND',
        message: `The requested record from collection '${this.collectionIdOrName}' was not found.`,
      })
    }
    return list.items[0]!
  }

  async getOne(id: string, options: RecordOptions = {}): Promise<T> {
    const cleanId = encodeURIComponent(id)
    return this.client.get<T>(`${this.basePath}/${cleanId}`, {
      query: options,
    })
  }

  async create(
    body: Partial<T> | FormData,
    options: RecordOptions = {}
  ): Promise<T> {
    return this.client.post<T>(this.basePath, {
      body,
      query: options,
    })
  }

  async update(
    id: string,
    body: Partial<T> | FormData,
    options: RecordOptions = {}
  ): Promise<T> {
    const cleanId = encodeURIComponent(id)
    return this.client.patch<T>(`${this.basePath}/${cleanId}`, {
      body,
      query: options,
    })
  }

  async delete(id: string, options: RecordOptions = {}): Promise<boolean> {
    const cleanId = encodeURIComponent(id)
    await this.client.delete(`${this.basePath}/${cleanId}`, {
      query: options,
    })
    return true
  }

  // --- Auth Flow Methods ---

  async authWithPassword(
    identity: string,
    password: string,
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    const res = await this.client.post<RecordAuthResponse<T>>(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/auth-with-password`,
      {
        body: { identity, password },
        query: options,
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.record)
    }
    return res
  }

  async authWithOAuth2(
    oauthOptions: {
      provider: string
      code: string
      codeVerifier: string
      redirectUrl: string
      createData?: Record<string, any>
    },
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    const res = await this.client.post<RecordAuthResponse<T>>(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/auth-with-oauth2`,
      {
        body: oauthOptions,
        query: options,
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.record)
    }
    return res
  }

  async authWithOtp(
    otpId: string,
    password: string,
    options: RecordOptions = {}
  ): Promise<RecordAuthResponse<T>> {
    const res = await this.client.post<RecordAuthResponse<T>>(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/auth-with-otp`,
      {
        body: { otpId, password },
        query: options,
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.record)
    }
    return res
  }

  async requestPasswordReset(
    email: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/request-password-reset`,
      {
        body: { email },
        query: options,
      }
    )
    return true
  }

  async confirmPasswordReset(
    token: string,
    password: string,
    passwordConfirm: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/confirm-password-reset`,
      {
        body: { token, password, passwordConfirm },
        query: options,
      }
    )
    return true
  }

  async requestVerification(
    email: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/request-verification`,
      {
        body: { email },
        query: options,
      }
    )
    return true
  }

  async confirmVerification(
    token: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/confirm-verification`,
      {
        body: { token },
        query: options,
      }
    )
    return true
  }

  async requestEmailChange(
    newEmail: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/request-email-change`,
      {
        body: { newEmail },
        query: options,
      }
    )
    return true
  }

  async confirmEmailChange(
    token: string,
    password: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/confirm-email-change`,
      {
        body: { token, password },
        query: options,
      }
    )
    return true
  }

  async impersonate(
    id: string,
    duration?: number
  ): Promise<RecordAuthResponse<T>> {
    const res = await this.client.post<RecordAuthResponse<T>>(
      `/api/collections/${encodeURIComponent(this.collectionIdOrName)}/impersonate/${encodeURIComponent(id)}`,
      {
        body: { duration },
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.record)
    }
    return res
  }

  // --- Realtime Subscriptions ---

  async subscribe(
    callback: RealtimeSubscriber<T>,
    options: RealtimeSubscriptionOptions = {}
  ): Promise<() => void> {
    if (!this.realtimeProvider) {
      throw new Error(
        'Realtime is not configured or supported in this client instance.'
      )
    }

    const handler = async (event: RealtimeEventPayload<T>) => {
      if (
        options.autoFetch &&
        (event.action === 'create' || event.action === 'update') &&
        event.data?.id
      ) {
        try {
          event.record = await this.getOne(event.data.id)
        } catch {
          // If deleted or unauthorized by viewRule, record remains undefined
        }
      }
      callback(event)
    }

    return this.realtimeProvider.subscribe(this.collectionIdOrName, handler)
  }

  async unsubscribe(): Promise<void> {
    if (!this.realtimeProvider) return
    return this.realtimeProvider.unsubscribe(this.collectionIdOrName)
  }
}
