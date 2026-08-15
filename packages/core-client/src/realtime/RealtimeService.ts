/**
 * @solarch/core-client - RealtimeService
 */

import type { WebSocketFactory } from '../contracts/interfaces.js'
import type { RealtimeEventPayload } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'
import type { RealtimeTransport } from './RealtimeTransport.js'
import { SseTransportAdapter } from './SseTransportAdapter.js'
import { WebSocketTransportAdapter } from './WebSocketTransportAdapter.js'


export type RealtimeTopicSubscriber = (event: RealtimeEventPayload<any>) => void

export interface RealtimeServiceOptions {
  wsFactory?: WebSocketFactory
  transport?: 'ws' | 'sse' | 'auto'
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class RealtimeService {
  private transport: RealtimeTransport
  private subscriptions: Map<string, Set<RealtimeTopicSubscriber>> = new Map()
  private clientId: string = ''

  getClientId(): string {
    return this.clientId
  }
  private reconnectAttempts: number = 0
  private isConnecting: boolean = false
  private autoReconnect: boolean
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private transportType: 'ws' | 'sse' | 'auto'
  private wsFactory?: WebSocketFactory

  constructor(
    readonly client: HttpClient,
    options: RealtimeServiceOptions = {}
  ) {
    this.transportType = options.transport || 'auto'
    this.wsFactory = options.wsFactory
    this.autoReconnect = options.autoReconnect !== false
    this.reconnectInterval = options.reconnectInterval || 2000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10

    if (this.transportType === 'sse') {
      this.transport = new SseTransportAdapter()
    } else {
      this.transport = new WebSocketTransportAdapter(this.wsFactory)
    }


    this.setupTransportListeners()
  }

  private setupTransportListeners(): void {
    this.transport.onMessage((raw) => {
      this.handleIncomingMessage(raw)
    })

    this.transport.onClose(() => {
      this.clientId = ''
      if (this.autoReconnect && this.subscriptions.size > 0) {
        this.scheduleReconnect()
      }
    })

    this.transport.onError(() => {
      // Error handling
    })
  }

  private channelAliases: Map<string, string> = new Map()

  private handleIncomingMessage(raw: string): void {
    if (!raw || typeof raw !== 'string') return

    let msg: any
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    if (!msg || typeof msg !== 'object') return

    if (msg.type === 'connected') {
      this.clientId = msg.clientId || ''
      this.reconnectAttempts = 0
      this.resubscribeAll()
      return
    }

    if (msg.type === 'subscribed' && Array.isArray(msg.channels)) {
      for (const ch of msg.channels) {
        if (typeof ch === 'string' && ch.startsWith('collections.') && ch.endsWith('.records')) {
          const colId = ch.slice('collections.'.length, -('.records'.length))
          for (const other of msg.channels) {
            if (other !== ch) {
              this.channelAliases.set(ch, other)
              this.channelAliases.set(colId, other)
            }
          }
        }
      }
      return
    }

    if (msg.type === 'ping') {
      try {
        this.transport.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      } catch {}
      return
    }

    if (msg.type === 'event' && msg.data) {
      const channel = msg.channel || ''
      const payload: RealtimeEventPayload = msg.data
      const dispatchedSubs = new Set<RealtimeTopicSubscriber>()

      const notifyList = (subs?: Set<RealtimeTopicSubscriber>) => {
        if (!subs) return
        for (const sub of subs) {
          if (!dispatchedSubs.has(sub)) {
            dispatchedSubs.add(sub)
            try {
              sub(payload)
            } catch (err) {
              console.error('Error in realtime subscriber:', err)
            }
          }
        }
      }

      // 1. Dispatch exact channel match (e.g. "collections.col_123.records")
      notifyList(this.subscriptions.get(channel))

      // 2. Dispatch collection ID match (e.g. "col_123")
      if (payload.collectionId) {
        notifyList(this.subscriptions.get(payload.collectionId))
      }

      // 3. Dispatch channel aliases (e.g. "live_feed")
      const alias1 = this.channelAliases.get(channel)
      if (alias1) notifyList(this.subscriptions.get(alias1))
      if (payload.collectionId) {
        const alias2 = this.channelAliases.get(payload.collectionId)
        if (alias2) notifyList(this.subscriptions.get(alias2))
      }

      // 4. Dispatch wildcard subscribers
      notifyList(this.subscriptions.get('*'))
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    )

    setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  private getRealtimeUrl(): string {
    let base = this.client.baseUrl

    if (this.transportType !== 'sse') {
      if (base.startsWith('http://')) {
        base = 'ws://' + base.slice(7)
      } else if (base.startsWith('https://')) {
        base = 'wss://' + base.slice(8)
      } else if (!base.startsWith('ws://') && !base.startsWith('wss://')) {
        base = 'ws://' + base.replace(/^\/+/, '')
      }
    }

    const token = this.client.authStore.getToken()
    const query = token ? `?token=${encodeURIComponent(token)}` : ''
    return `${base.replace(/\/+$/, '')}/api/realtime${query}`
  }

  async connect(): Promise<void> {
    if (this.transport.isConnected() || this.isConnecting) return

    this.isConnecting = true
    const url = this.getRealtimeUrl()

    try {
      await this.transport.connect(url)
    } finally {
      this.isConnecting = false
    }
  }

  disconnect(): void {
    this.transport.disconnect()
    this.clientId = ''
    this.subscriptions.clear()
  }

  private resubscribeAll(): void {
    if (!this.transport.isConnected() || this.subscriptions.size === 0) return

    const topics = Array.from(this.subscriptions.keys())
    try {
      this.transport.send(JSON.stringify({ type: 'subscribe', channels: topics }))
    } catch {}
  }

  async subscribe(
    topic: string,
    callback: RealtimeTopicSubscriber
  ): Promise<() => void> {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set())
    }
    this.subscriptions.get(topic)!.add(callback)

    if (!this.transport.isConnected()) {
      await this.connect()
    } else {
      try {
        this.transport.send(JSON.stringify({ type: 'subscribe', channels: [topic] }))
      } catch {}
    }

    return () => {
      this.unsubscribeTopicSubscriber(topic, callback)
    }
  }

  private unsubscribeTopicSubscriber(
    topic: string,
    callback: RealtimeTopicSubscriber
  ): void {
    const subs = this.subscriptions.get(topic)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        this.subscriptions.delete(topic)
        if (this.transport.isConnected()) {
          try {
            this.transport.send(JSON.stringify({ type: 'unsubscribe', channels: [topic] }))
          } catch {}
        }
      }
    }
  }

  async unsubscribe(topic?: string): Promise<void> {
    if (topic) {
      this.subscriptions.delete(topic)
      if (this.transport.isConnected()) {
        try {
          this.transport.send(JSON.stringify({ type: 'unsubscribe', channels: [topic] }))
        } catch {}
      }
    } else {
      this.subscriptions.clear()
      if (this.transport.isConnected()) {
        try {
          this.transport.send(JSON.stringify({ type: 'unsubscribe', channels: ['*'] }))
        } catch {}
      }
    }
  }

  isConnected(): boolean {
    return this.transport.isConnected()
  }
}
