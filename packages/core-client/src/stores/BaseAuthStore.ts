/**
 * @solarch/core-client - BaseAuthStore Implementation
 */

import type { AuthModel } from '../contracts/types.js'
import type { AuthStore, AuthStoreSubscriber } from './AuthStore.js'

export function decodeJwtPayload(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    let jsonStr = ''
    if (typeof atob === 'function') {
      jsonStr = atob(base64)
    } else if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(base64, 'base64').toString('utf8')
    } else {
      // Platform-neutral fallback for environments without atob or Buffer
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let str = ''
      let buffer = 0
      let bits = 0
      for (let i = 0; i < base64.length; i++) {
        const char = base64.charAt(i)
        if (char === '=') break
        const index = chars.indexOf(char)
        if (index >= 0) {
          buffer = (buffer << 6) | index
          bits += 6
          if (bits >= 8) {
            bits -= 8
            str += String.fromCharCode((buffer >> bits) & 0xff)
          }
        }
      }
      jsonStr = decodeURIComponent(escape(str))
    }
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

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

    const payload = decodeJwtPayload(this.token)
    if (!payload) return false

    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      return payload.exp > now
    }

    return true
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
