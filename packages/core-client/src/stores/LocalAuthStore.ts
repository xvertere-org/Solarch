/**
 * @solarch/core-client - LocalAuthStore (LocalStorage Adapter with safe browser detection)
 */

import type { AuthModel } from '../contracts/types.js'
import { BaseAuthStore } from './BaseAuthStore.js'

export const DEFAULT_STORAGE_KEY = 'solarch_auth'

export class LocalAuthStore extends BaseAuthStore {
  readonly storageKey: string

  constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    super()
    this.storageKey = storageKey
    this.loadFromStorage()
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined' &&
        window.localStorage !== null
      )
    } catch {
      return false
    }
  }

  private loadFromStorage(): void {
    if (!this.isLocalStorageAvailable()) return

    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.token === 'string') {
          this.token = parsed.token
          this.model = parsed.model || null
        }
      }
    } catch {
      // Ignore parse errors from corrupted storage
    }
  }

  override save(token: string, model: AuthModel): void {
    super.save(token, model)
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(
          this.storageKey,
          JSON.stringify({ token: this.token, model: this.model })
        )
      } catch {
        // Storage quota exceeded or disabled
      }
    }
  }

  override clear(): void {
    super.clear()
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(this.storageKey)
      } catch {
        // Storage disabled
      }
    }
  }
}
