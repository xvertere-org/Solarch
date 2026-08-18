import { describe, it, expect, vi } from 'vitest'
import { Broker, Client, Message } from '../../src/tools/subscriptions/broker'
import { InMemoryRealtimeProvider, RealtimeProvider, RealtimeMessageHandler } from '../../src/tools/subscriptions/provider'

describe('F-005 Realtime Architecture: Provider & Transport Decoupling Evaluation', () => {
  // Helper to create a test client
  function createTestClient(id: string): { client: Client; received: string[] } {
    const received: string[] = []
    const client: Client = {
      id,
      channels: new Set(),
      authContext: { record: null, isAdmin: false },
      send: (msg: string) => {
        received.push(msg)
      },
      close: () => {},
    }
    return { client, received }
  }

  describe('1. RealtimeProvider Pub/Sub Contract', () => {
    it('implements publish, subscribe, and unsubscribe lifecycle', async () => {
      const provider: RealtimeProvider = new InMemoryRealtimeProvider()
      const received: Message[] = []
      const handler: RealtimeMessageHandler = (msg) => received.push(msg)

      await provider.subscribe('posts', handler)
      await provider.publish('posts', {
        type: 'event',
        channel: 'posts',
        data: { id: 'p1', title: 'Post 1' },
      })

      expect(received).toHaveLength(1)
      expect(received[0].data.id).toBe('p1')

      await provider.unsubscribe('posts', handler)
      await provider.publish('posts', {
        type: 'event',
        channel: 'posts',
        data: { id: 'p2', title: 'Post 2' },
      })

      expect(received).toHaveLength(1) // No new messages after unsubscribe
      await provider.close()
    })

    it('supports multiple independent subscribers on the same channel', async () => {
      const provider = new InMemoryRealtimeProvider()
      const sub1: Message[] = []
      const sub2: Message[] = []

      const h1: RealtimeMessageHandler = (msg) => sub1.push(msg)
      const h2: RealtimeMessageHandler = (msg) => sub2.push(msg)

      await provider.subscribe('news', h1)
      await provider.subscribe('news', h2)

      await provider.publish('news', {
        type: 'event',
        channel: 'news',
        data: { headline: 'Breaking' },
      })

      expect(sub1).toHaveLength(1)
      expect(sub2).toHaveLength(1)

      await provider.close()
    })
  })

  describe('2. Broker Integration (Bidirectional Flow)', () => {
    it('routes provider events down to subscribed local client sockets (Provider → Broker → Client)', async () => {
      const provider = new InMemoryRealtimeProvider()
      const broker = new Broker(provider)
      const { client, received } = createTestClient('c_incoming')

      broker.addClient(client)
      broker.subscribe(client.id, 'incoming_feed')

      // Publish directly to the provider (simulating remote node / external source)
      await provider.publish('incoming_feed', {
        type: 'event',
        channel: 'incoming_feed',
        data: { from: 'remote_cluster', payload: 42 },
      })

      expect(received).toHaveLength(1)
      const parsed = JSON.parse(received[0])
      expect(parsed.data.from).toBe('remote_cluster')
      expect(parsed.data.payload).toBe(42)

      await provider.close()
    })

    it('delegates broker.send() to provider.publish() and reaches local clients', async () => {
      const provider = new InMemoryRealtimeProvider()
      const broker = new Broker(provider)
      const { client, received } = createTestClient('c_local')

      broker.addClient(client)
      broker.subscribe(client.id, 'outbox')

      broker.send('outbox', {
        type: 'event',
        channel: 'outbox',
        data: { status: 'dispatched' },
      })

      expect(received).toHaveLength(1)
      const parsed = JSON.parse(received[0])
      expect(parsed.data.status).toBe('dispatched')

      await provider.close()
    })
  })

  describe('3. Channel & Subscriber Isolation Invariants', () => {
    it('strictly isolates channels: only subscribers of the target channel receive events', async () => {
      const provider = new InMemoryRealtimeProvider()
      const broker = new Broker(provider)

      const { client: clientA, received: receivedA } = createTestClient('client_A')
      const { client: clientB, received: receivedB } = createTestClient('client_B')
      const { client: clientC, received: receivedC } = createTestClient('client_C')

      broker.addClient(clientA)
      broker.addClient(clientB)
      broker.addClient(clientC)

      // Client A and C subscribe to 'articles'; Client B subscribes to 'system'
      broker.subscribe(clientA.id, 'articles')
      broker.subscribe(clientB.id, 'system')
      broker.subscribe(clientC.id, 'articles')

      broker.send('articles', {
        type: 'event',
        channel: 'articles',
        data: { articleId: 'art_101' },
      })

      expect(receivedA).toHaveLength(1)
      expect(receivedC).toHaveLength(1)
      expect(receivedB).toHaveLength(0) // Client B must NOT receive 'articles' events

      // Send to system channel
      broker.send('system', {
        type: 'event',
        channel: 'system',
        data: { alert: 'reboot' },
      })

      expect(receivedA).toHaveLength(1) // Still 1
      expect(receivedC).toHaveLength(1) // Still 1
      expect(receivedB).toHaveLength(1) // Client B receives 'system' event

      await provider.close()
    })

    it('guarantees duplicate subscription idempotency (single delivery per event)', async () => {
      const provider = new InMemoryRealtimeProvider()
      const broker = new Broker(provider)
      const { client, received } = createTestClient('c_dup')

      broker.addClient(client)
      // Subscribing twice to the same channel
      broker.subscribe(client.id, 'announcements')
      broker.subscribe(client.id, 'announcements')

      broker.send('announcements', {
        type: 'event',
        channel: 'announcements',
        data: { msg: 'Hello' },
      })

      expect(received).toHaveLength(1) // Must deliver exactly once

      await provider.close()
    })
  })

  describe('4. Lifecycle & Memory Leak Cleanup', () => {
    it('unsubscribes from provider when last client unsubscribes from a channel', async () => {
      const provider = new InMemoryRealtimeProvider()
      const unsubscribeSpy = vi.spyOn(provider, 'unsubscribe')
      const broker = new Broker(provider)

      const { client: c1 } = createTestClient('c1')
      const { client: c2 } = createTestClient('c2')

      broker.addClient(c1)
      broker.addClient(c2)

      broker.subscribe(c1.id, 'room_1')
      broker.subscribe(c2.id, 'room_1')

      // c1 unsubscribes; room_1 still has c2, so provider subscription remains active
      broker.unsubscribe(c1.id, 'room_1')
      expect(unsubscribeSpy).not.toHaveBeenCalled()
      expect(broker.getChannelSubscribers('room_1')).toEqual(['c2'])

      // c2 unsubscribes; room_1 is now empty -> unregisters provider handler
      broker.unsubscribe(c2.id, 'room_1')
      expect(unsubscribeSpy).toHaveBeenCalledWith('room_1', expect.any(Function))
      expect(broker.getChannelCount()).toBe(0)

      await provider.close()
    })

    it('cleans up all channel subscriptions and provider handlers when removeClient is called', async () => {
      const provider = new InMemoryRealtimeProvider()
      const unsubscribeSpy = vi.spyOn(provider, 'unsubscribe')
      const broker = new Broker(provider)

      const { client: c1 } = createTestClient('c1')
      broker.addClient(c1)
      broker.subscribe(c1.id, 'ch_alpha')
      broker.subscribe(c1.id, 'ch_beta')

      expect(broker.getChannelCount()).toBe(2)

      broker.removeClient(c1.id)

      expect(broker.getClientCount()).toBe(0)
      expect(broker.getChannelCount()).toBe(0)
      expect(unsubscribeSpy).toHaveBeenCalledWith('ch_alpha', expect.any(Function))
      expect(unsubscribeSpy).toHaveBeenCalledWith('ch_beta', expect.any(Function))

      await provider.close()
    })

    it('evicts failing client sockets during dispatch without crashing broker', async () => {
      const provider = new InMemoryRealtimeProvider()
      const broker = new Broker(provider)

      const failingClient: Client = {
        id: 'c_fail',
        channels: new Set(),
        authContext: { record: null, isAdmin: false },
        send: () => {
          throw new Error('Socket closed broken pipe')
        },
        close: () => {},
      }

      broker.addClient(failingClient)
      broker.subscribe(failingClient.id, 'alerts')

      expect(broker.getClientCount()).toBe(1)

      // Sending should catch socket error and evict the failing client
      broker.send('alerts', {
        type: 'event',
        channel: 'alerts',
        data: { text: 'test' },
      })

      expect(broker.getClientCount()).toBe(0)

      await provider.close()
    })
  })

  describe('5. Failure & Resilience Handlers', () => {
    it('handles provider.publish rejection with local fallback dispatch without throwing', async () => {
      const failingProvider: RealtimeProvider = {
        publish: vi.fn().mockRejectedValue(new Error('Network partition')),
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }

      const broker = new Broker(failingProvider)
      const { client, received } = createTestClient('c_resilient')

      broker.addClient(client)
      broker.subscribe(client.id, 'updates')

      // Should not throw, and should fallback to local dispatch
      expect(() => {
        broker.send('updates', {
          type: 'event',
          channel: 'updates',
          data: { key: 'fallback_val' },
        })
      }).not.toThrow()

      // Give microtask tick for async catch block
      await new Promise((r) => setTimeout(r, 10))

      expect(received).toHaveLength(1)
      const parsed = JSON.parse(received[0])
      expect(parsed.data.key).toBe('fallback_val')
    })
  })

  describe('6. Distributed Multi-Broker Topology Contract', () => {
    it('enables cross-node event distribution: Broker B publish reaches Broker A subscribers via shared provider', async () => {
      // Shared distributed pub/sub provider connecting 2 independent Broker nodes
      const sharedProvider: RealtimeProvider = new InMemoryRealtimeProvider()

      const brokerNodeA = new Broker(sharedProvider)
      const brokerNodeB = new Broker(sharedProvider)

      // Client connected to Node A
      const { client: clientOnNodeA, received: receivedA } = createTestClient('client_node_A')
      brokerNodeA.addClient(clientOnNodeA)
      brokerNodeA.subscribe(clientOnNodeA.id, 'shared_chat')

      // Client connected to Node B
      const { client: clientOnNodeB, received: receivedB } = createTestClient('client_node_B')
      brokerNodeB.addClient(clientOnNodeB)
      brokerNodeB.subscribe(clientOnNodeB.id, 'unrelated_channel')

      // Publish event from Node B to 'shared_chat'
      brokerNodeB.send('shared_chat', {
        type: 'event',
        channel: 'shared_chat',
        data: { sender: 'Node_B_User', text: 'Hello from Node B!' },
      })

      // Client on Node A must receive the event across the provider boundary
      expect(receivedA).toHaveLength(1)
      const parsedA = JSON.parse(receivedA[0])
      expect(parsedA.data.sender).toBe('Node_B_User')
      expect(parsedA.data.text).toBe('Hello from Node B!')

      // Client on Node B (subscribed to unrelated_channel) must NOT receive it
      expect(receivedB).toHaveLength(0)

      await sharedProvider.close()
    })
  })
})
