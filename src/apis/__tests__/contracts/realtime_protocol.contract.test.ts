import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { serve } from '../../serve'
import { WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Realtime Protocol Contract (CORE-8 / CORE-10)', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-rt-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
    if (app) {
      await app.db().close()
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('sends protocolVersion: "1.0" in connected handshake message', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)

    const connectedMsg = await new Promise<any>((resolve, reject) => {
      ws.on('message', (data) => {
        try {
          resolve(JSON.parse(data.toString()))
        } catch (e) {
          reject(e)
        }
      })
      ws.on('error', reject)
    })

    expect(connectedMsg).toHaveProperty('type', 'connected')
    expect(connectedMsg).toHaveProperty('clientId')
    expect(connectedMsg).toHaveProperty('protocolVersion', '1.0')
    expect(connectedMsg).toHaveProperty('authenticated')

    ws.close()
  })

  it('handles ping / pong heartbeat with timestamp', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve())
    })

    const pongPromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'pong') {
          resolve(msg)
        }
      })
    })

    ws.send(JSON.stringify({ type: 'ping' }))
    const pong = await pongPromise

    expect(pong.type).toBe('pong')
    expect(typeof pong.timestamp).toBe('number')

    ws.close()
  })

  it('subscribes by collection name and receives minimal mutation event on record creation', async () => {
    // 1. Create collection with public view rule
    const { Collection } = await import('../../../core/collection')
    const testCol = new Collection({
      name: 'rt_test_posts',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'sensitiveData', type: 'text' },
      ],
    })
    await app.save(testCol)

    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)

    const messages: any[] = []
    const messageWaiters: ((msg: any) => void)[] = []

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (messageWaiters.length > 0) {
        const waiter = messageWaiters.shift()!
        waiter(msg)
      } else {
        messages.push(msg)
      }
    })

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })

    function waitForMessage(predicate: (msg: any) => boolean): Promise<any> {
      return new Promise((resolve) => {
        const idx = messages.findIndex(predicate)
        if (idx >= 0) {
          const [found] = messages.splice(idx, 1)
          return resolve(found)
        }
        const handler = (msg: any) => {
          if (predicate(msg)) {
            resolve(msg)
          } else {
            messageWaiters.push(handler)
          }
        }
        messageWaiters.push(handler)
      })
    }

    // Wait for connected message
    const connectedMsg = await waitForMessage(m => m.type === 'connected')
    expect(connectedMsg.type).toBe('connected')

    // Subscribe by collection name
    ws.send(JSON.stringify({
      type: 'subscribe',
      channels: ['rt_test_posts'],
    }))

    const subConfirm = await waitForMessage(m => m.type === 'subscribed')
    expect(subConfirm.type).toBe('subscribed')

    // Create record via REST API
    const res = await fetch(`http://127.0.0.1:${port}/api/collections/rt_test_posts/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Realtime Test Title',
        sensitiveData: 'top_secret_info',
      }),
    })
    const createdRecord = await res.json()
    expect(res.status).toBe(201)

    // Wait for realtime event
    const eventMsg = await waitForMessage(m => m.type === 'event')
    expect(eventMsg.type).toBe('event')
    expect(eventMsg.channel).toBe(`collections.${testCol.id}.records`)
    expect(eventMsg.data.action).toBe('create')
    expect(eventMsg.data.collectionId).toBe(testCol.id)
    expect(eventMsg.data.data).toEqual({ id: createdRecord.id })
    expect(eventMsg.data.timestamp).toBeDefined()

    // CRITICAL: Ensure full record fields are NOT leaked in realtime event
    expect(eventMsg.data.record).toBeUndefined()
    expect(eventMsg.data.title).toBeUndefined()
    expect(eventMsg.data.sensitiveData).toBeUndefined()

    ws.close()
  })
})
