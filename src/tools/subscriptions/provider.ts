import { EventEmitter } from 'events'
import { Message } from './broker'

export type RealtimeMessageHandler = (message: Message) => void

export interface RealtimeProvider {
  /**
   * Publish a message to a specific channel.
   */
  publish(channel: string, message: Message): Promise<void>

  /**
   * Subscribe a listener function to messages on a specific channel.
   */
  subscribe(channel: string, handler: RealtimeMessageHandler): Promise<void>

  /**
   * Unsubscribe a listener function from a specific channel.
   */
  unsubscribe(channel: string, handler: RealtimeMessageHandler): Promise<void>

  /**
   * Close provider connections cleanly.
   */
  close(): Promise<void>
}

/**
 * Default process-local in-memory realtime provider using Node EventEmitter.
 */
export class InMemoryRealtimeProvider implements RealtimeProvider {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(0) // Unlimited listeners for concurrent subscriptions
  }

  async publish(channel: string, message: Message): Promise<void> {
    this.emitter.emit(channel, message)
  }

  async subscribe(channel: string, handler: RealtimeMessageHandler): Promise<void> {
    this.emitter.on(channel, handler)
  }

  async unsubscribe(channel: string, handler: RealtimeMessageHandler): Promise<void> {
    this.emitter.off(channel, handler)
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}
