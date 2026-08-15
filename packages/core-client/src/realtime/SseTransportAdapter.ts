/**
 * @solarch/core-client - Server-Sent Events (SSE) Realtime Transport Adapter
 */

import type { RealtimeTransport } from './RealtimeTransport.js'

export class SseTransportAdapter implements RealtimeTransport {
  private eventSource: any = null
  private messageListeners: Set<(data: string) => void> = new Set()
  private openListeners: Set<() => void> = new Set()
  private closeListeners: Set<(code?: number, reason?: string) => void> = new Set()
  private errorListeners: Set<(err: any) => void> = new Set()

  async connect(url: string): Promise<void> {
    this.disconnect()

    return new Promise((resolve, reject) => {
      if (typeof EventSource === 'undefined') {
        return reject(new Error('EventSource is not supported in this runtime environment.'))
      }

      let settled = false
      try {
        this.eventSource = new EventSource(url)
      } catch (err) {
        return reject(err)
      }

      this.eventSource.onopen = () => {
        if (!settled) {
          settled = true
          resolve()
        }
        for (const l of this.openListeners) l()
      }

      this.eventSource.onmessage = (event: any) => {
        const raw = typeof event.data === 'string' ? event.data : ''
        for (const l of this.messageListeners) l(raw)
      }

      this.eventSource.onerror = (err: any) => {
        if (!settled) {
          settled = true
          reject(err)
        }
        for (const l of this.errorListeners) l(err)
      }
    })
  }

  disconnect(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close()
      } catch {}
      this.eventSource = null
      for (const l of this.closeListeners) l(1000, 'Normal Closure')
    }
  }

  send(_data: string): void {
    throw new Error('SSE transport is unidirectional and does not support client-to-server messages.')
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
    return !!this.eventSource && this.eventSource.readyState === 1
  }
}

export const SseTransport = SseTransportAdapter
