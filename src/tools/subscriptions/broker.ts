import { RecordModel as PBRecord } from '../../core/record'

export interface Message {
  type: string
  channel: string
  data: any
  clientId?: string
}

/**
 * Auth context stored on each broker Client so that per-record event
 * authorization can be evaluated at broadcast time without relying on
 * closure variables that are inaccessible from broadcastRecordEvent.
 */
export interface RealtimeAuthContext {
  record: PBRecord | null
  isAdmin: boolean
}

export interface Client {
  id: string
  channels: Set<string>
  /** Auth context resolved at connection time. Always present. */
  authContext: RealtimeAuthContext
  send: (message: string) => void
  close: () => void
}

export class Broker {
  private clients: Map<string, Client> = new Map()
  private channels: Map<string, Set<string>> = new Map()

  addClient(client: Client): void {
    this.clients.set(client.id, client)
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId)
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      for (const channel of client.channels) {
        const subscribers = this.channels.get(channel)
        if (subscribers) {
          subscribers.delete(clientId)
        }
      }
      this.clients.delete(clientId)
    }
  }

  subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.channels.add(channel)

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(clientId)
  }

  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.channels.delete(channel)
    }

    const subscribers = this.channels.get(channel)
    if (subscribers) {
      subscribers.delete(clientId)
    }
  }

  send(channel: string, message: Message): void {
    const subscribers = this.channels.get(channel)
    if (!subscribers) return

    const messageStr = JSON.stringify(message)
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId)
      if (client) {
        try {
          client.send(messageStr)
        } catch {
          this.removeClient(clientId)
        }
      }
    }
  }

  getClientCount(): number {
    return this.clients.size
  }

  getChannelCount(): number {
    return this.channels.size
  }

  getChannelSubscribers(channel: string): string[] {
    return Array.from(this.channels.get(channel) ?? [])
  }
}
