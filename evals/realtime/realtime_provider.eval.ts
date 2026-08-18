import { describe, it, expect, vi } from 'vitest'
import { Broker, Client, Message } from '../../src/tools/subscriptions/broker'
import { InMemoryRealtimeProvider, RealtimeProvider } from '../../src/tools/subscriptions/provider'

describe('Realtime Provider & Transport Decoupling Evaluation (F-005)', () => {
  it('satisfies the RealtimeProvider pub/sub contract with InMemoryRealtimeProvider', async () => {
    const provider: RealtimeProvider = new InMemoryRealtimeProvider()
    const received: Message[] = []

    const handler = (msg: Message) => {
      received.push(msg)
    }

    await provider.subscribe('posts', handler)

    await provider.publish('posts', {
      type: 'event',
      channel: 'posts',
      data: { action: 'create', id: 'p1' },
    })

    expect(received.length).toBe(1)
    expect(received[0].data.id).toBe('p1')

    await provider.unsubscribe('posts', handler)

    await provider.publish('posts', {
      type: 'event',
      channel: 'posts',
      data: { action: 'create', id: 'p2' },
    })

    expect(received.length).toBe(1) // No new messages after unsubscribe
    await provider.close()
  })

  it('Broker delegates pub/sub to RealtimeProvider while managing transport sockets', async () => {
    const provider = new InMemoryRealtimeProvider()
    const broker = new Broker(provider)

    const clientMessages: string[] = []
    const client: Client = {
      id: 'c1',
      channels: new Set(),
      authContext: { record: null, isAdmin: false },
      send: (msg: string) => {
        clientMessages.push(msg)
      },
      close: () => {},
    }

    broker.addClient(client)
    broker.subscribe('c1', 'articles')

    expect(broker.getClientCount()).toBe(1)
    expect(broker.getChannelCount()).toBe(1)
    expect(broker.getChannelSubscribers('articles')).toEqual(['c1'])

    // Send a message through the broker
    broker.send('articles', {
      type: 'event',
      channel: 'articles',
      data: { title: 'First Article' },
    })

    expect(clientMessages.length).toBe(1)
    const parsed = JSON.parse(clientMessages[0])
    expect(parsed.data.title).toBe('First Article')

    // Unsubscribe
    broker.unsubscribe('c1', 'articles')
    expect(broker.getChannelSubscribers('articles')).toEqual([])

    broker.removeClient('c1')
    expect(broker.getClientCount()).toBe(0)
    await provider.close()
  })

  it('supports custom / distributed RealtimeProvider implementations cleanly', async () => {
    const mockDistributedPublish = vi.fn().mockResolvedValue(undefined)
    const mockDistributedSubscribe = vi.fn().mockResolvedValue(undefined)
    const mockDistributedUnsubscribe = vi.fn().mockResolvedValue(undefined)
    const mockDistributedClose = vi.fn().mockResolvedValue(undefined)

    const customProvider: RealtimeProvider = {
      publish: mockDistributedPublish,
      subscribe: mockDistributedSubscribe,
      unsubscribe: mockDistributedUnsubscribe,
      close: mockDistributedClose,
    }

    const broker = new Broker(customProvider)
    const client: Client = {
      id: 'c2',
      channels: new Set(),
      authContext: { record: null, isAdmin: true },
      send: () => {},
      close: () => {},
    }

    broker.addClient(client)
    broker.subscribe('c2', 'system_notifications')

    expect(mockDistributedSubscribe).toHaveBeenCalledWith('system_notifications', expect.any(Function))

    broker.send('system_notifications', {
      type: 'event',
      channel: 'system_notifications',
      data: { alert: 'backup completed' },
    })

    expect(mockDistributedPublish).toHaveBeenCalledWith('system_notifications', expect.objectContaining({
      type: 'event',
      channel: 'system_notifications',
    }))
  })
})
