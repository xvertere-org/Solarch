/**
 * @solarch/core-client - BaseAuthStore Implementation
 */

import type { AuthModel } from '../contracts/types.js'
import type { AuthStore, AuthStoreSubscriber } from './AuthStore.js'

export abstract class BaseAuthStore implements AuthStore {
  protected token: string = ''
  protected model: AuthModel = null
  protected subscribers: Set<AuthStoreSubscriber> = new Set()

  getToken(): string {
    return this.token
  }

  getModel(): AuthModel {
    return this.model
  }

  isValid(): boolean {
    return !!this.token
  }


  save(token: string, model: AuthModel): void {
    this.token = token || ''
    this.model = model || null
    this.notify()
  }

  clear(): void {
    this.token = ''
    this.model = null
    this.notify()
  }

  subscribe(callback: AuthStoreSubscriber): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  protected notify(): void {
    const token = this.token
    const model = this.model
    for (const sub of this.subscribers) {
      try {
        sub(token, model)
      } catch (err) {
        console.error('Error in AuthStore subscriber:', err)
      }
    }
  }
}
