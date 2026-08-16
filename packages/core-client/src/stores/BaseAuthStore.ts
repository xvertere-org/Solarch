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
    if (!this.token) return false

    const parts = this.token.split('.')
    if (parts.length !== 3) {
      // Non-JWT token (e.g. opaque API key) — treat as valid non-expiring token
      return true
    }

    // Token has 3 parts (JWT-shaped) -> must decode successfully
    const payload = this.decodeJwtPayload(this.token)
    if (!payload) {
      // 3-part token that failed decoding/parsing is corrupted -> invalid
      return false
    }

    if (typeof payload.exp !== 'number') {
      // Valid JWT payload without exp claim — non-expiring token
      return true
    }

    // exp is in seconds since epoch; compare with current time
    return payload.exp > Date.now() / 1000
  }

  /**
   * Decodes a JWT payload without verifying the signature.
   * Uses only platform-neutral base64 decoding (no Node built-ins in the hot path).
   */
  private decodeJwtPayload(token: string): Record<string, any> | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    try {
      // Platform-neutral base64url decode
      let base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
      // Pad to multiple of 4
      while (base64.length % 4 !== 0) {
        base64 += '='
      }

      let jsonStr: string
      if (typeof atob === 'function') {
        jsonStr = atob(base64)
      } else if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(base64, 'base64').toString('utf-8')
      } else {
        return null
      }
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
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
