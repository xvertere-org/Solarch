/**
 * @solarch/core-client - WebSocket Realtime Transport
 */

import type { WebSocketFactory, WebSocketLike } from '../contracts/interfaces.js'
import type { RealtimeTransport } from './RealtimeTransport.js'

export class WebSocketTransport implements RealtimeTransport {
  private ws: WebSocketLike | null = null
  private wsFactory?: WebSocketFactory
  private messageListeners: Set<(data: string) => void> = new Set()
  private openListeners: Set<() => void> = new Set()
  private closeListeners: Set<(code?: number, reason?: string) => void> = new Set()
  private errorListeners: Set<(err: any) => void> = new Set()

  constructor(wsFactory?: WebSocketFactory) {
    this.wsFactory = wsFactory
  }

  private createWebSocket(url: string): WebSocketLike {
    if (this.wsFactory) {
      return this.wsFactory(url)
    }
    if (typeof WebSocket !== 'undefined') {
      return new WebSocket(url) as unknown as WebSocketLike
    }
    throw new Error(
      'No global WebSocket found. Please provide a custom WebSocketFactory in options.'
    )
  }

  async connect(url: string): Promise<void> {
    this.disconnect()

    return new Promise((resolve, reject) => {
      let settled = false

      try {
        this.ws = this.createWebSocket(url)
      } catch (err) {
        return reject(err)
      }

      this.ws.onopen = () => {
        if (!settled) {
          settled = true
          resolve()
        }
        for (const l of this.openListeners) l()
      }

      this.ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : event.data?.toString?.() || ''
        for (const l of this.messageListeners) l(raw)
      }

      this.ws.onclose = (event) => {
        const code = event && typeof event.code === 'number' ? event.code : undefined
        const reason = event && typeof event.reason === 'string' ? event.reason : undefined
        for (const l of this.closeListeners) l(code, reason)
      }

      this.ws.onerror = (err) => {
        if (!settled) {
          settled = true
          reject(err)
        }
        for (const l of this.errorListeners) l(err)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {}
      this.ws = null
    }
  }

  send(data: string): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error('WebSocket transport is not connected.')
    }
    this.ws.send(data)
  }

  onMessage(callback: (data: string) => void): void {
    this.messageListeners.add(callback)
  }

  onOpen(callback: () => void): void {
    this.openListeners.add(callback)
  }

  onClose(callback: (code?: number, reason?: string) => void): void {
    this.closeListeners.add(callback)
  }

  onError(callback: (err: any) => void): void {
    this.errorListeners.add(callback)
  }

  isConnected(): boolean {
    return !!this.ws && this.ws.readyState === 1
  }
}
