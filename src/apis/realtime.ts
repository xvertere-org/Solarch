import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { Broker, Client, Message } from '../tools/subscriptions/broker'
import { WebSocket } from 'ws'
import { canAccessRecord } from './record_helpers'
import { RecordModel as PBRecord } from '../core/record'
import { RecordFieldResolver, RequestInfo } from '../core/record_field_resolver'

const broker = new Broker()
const sseClients = new Map<string, Response>()

export function registerRealtimeRoutes(app: BaseApp, router: Router): void {
  // SSE endpoint
  router.get('/api/realtime', async (req: Request, res: Response) => {
    const clientId = req.query.clientId as string || generateClientId()
    const acceptHeader = req.headers.accept || ''

    if (acceptHeader.includes('text/event-stream')) {
      // SSE connection
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      const client: Client = {
        id: clientId,
        channels: new Set(),
        send: (message: string) => {
          res.write(`data: ${message}\n\n`)
        },
        close: () => {
          res.end()
        },
      }

      broker.addClient(client)
      sseClients.set(clientId, res)

      res.on('close', () => {
        broker.removeClient(clientId)
        sseClients.delete(clientId)
      })

      // Send initial connection ack
      client.send(JSON.stringify({ type: 'connected', clientId }))
    } else {
      // Regular JSON endpoint info
      res.json({
        code: 200,
        message: 'Realtime endpoint. Use WebSocket connection at ws://host:port/api/realtime or SSE at /api/realtime with Accept: text/event-stream',
        clientId,
      })
    }
  })

  // Subscription management via HTTP
  router.post('/api/realtime', async (req: Request, res: Response) => {
    try {
      const { clientId, subscriptions } = req.body
      if (!clientId || !Array.isArray(subscriptions)) {
        return res.status(400).json({ code: 400, message: 'Invalid request. clientId and subscriptions array required.' })
      }

      for (const sub of subscriptions) {
        if (sub.action === 'subscribe') {
          broker.subscribe(clientId, sub.channel)
        } else if (sub.action === 'unsubscribe') {
          broker.unsubscribe(clientId, sub.channel)
        }
      }

      res.json({
        code: 200,
        clientId,
        subscriptions: subscriptions.map((s: any) => s.channel),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}

export function setupWebSocketRealtime(wss: any, app?: BaseApp): void {
  wss.on('connection', (ws: WebSocket, req?: any) => {
    const clientId = generateClientId()
    const client: Client = {
      id: clientId,
      channels: new Set(),
      send: (message: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message)
        }
      },
      close: () => {
        ws.close()
      },
    }

    // Validate auth token if app is provided
    let authRecord: PBRecord | null = null
    let isAdmin = false
    if (app) {
      try {
        const url = req?.url || ''
        const queryIndex = url.indexOf('?')
        let token = ''
        if (queryIndex >= 0) {
          const searchParams = new URLSearchParams(url.slice(queryIndex))
          token = searchParams.get('token') || ''
        }
        if (!token && req?.headers?.authorization) {
          const authHeader = req.headers.authorization
          token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
        }
        if (token) {
          const payload = app.parseJWT(token, app.getJwtSecret())
          if (payload) {
            if (payload.type === 'admin' && payload.id) {
              isAdmin = true
            } else if (payload.type === 'auth' && payload.id) {
              const db = app.db().getDataDB()
              const collection = app.findCachedCollectionByNameOrId(payload.collectionId)
              if (collection) {
                const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(payload.id) as any
                if (row) {
                  authRecord = new PBRecord(collection.id, collection.name, row)
                }
              }
            }
          }
        }
      } catch {
        // Auth parsing failure — connection proceeds but authRecord remains null
      }
    }

    broker.addClient(client)

    ws.send(JSON.stringify({ type: 'connected', clientId, authenticated: !!(authRecord || isAdmin) }))

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          for (const channel of msg.channels) {
            // Check collection-level access for record channels
            if (app && channel.startsWith('collections.') && channel.endsWith('.records')) {
              const collectionId = channel.replace('collections.', '').replace('.records', '')
              let canSubscribe = false
              if (isAdmin) {
                canSubscribe = true
              } else {
                try {
                  const collection = app.findCachedCollectionByNameOrId(collectionId)
                  if (collection && collection.viewRule !== null) {
                    if (collection.viewRule === '') {
                      canSubscribe = true
                    } else if (authRecord) {
                      const requestInfo: RequestInfo = {
                        auth: authRecord, isAdmin: false, method: 'GET',
                        headers: {}, query: {}, body: {}, data: {}, context: 'view',
                      }
                      const resolver = new RecordFieldResolver({
                        app, record: authRecord, collection, requestInfo,
                      })
                      const { evaluateRule } = require('../core/record_field_resolver')
                      canSubscribe = evaluateRule(collection.viewRule, resolver)
                    }
                  }
                } catch {
                  canSubscribe = false
                }
              }
              if (!canSubscribe) {
                ws.send(JSON.stringify({ type: 'error', message: `Not authorized to subscribe to channel: ${channel}` }))
                continue
              }
            }
            broker.subscribe(clientId, channel)
          }
          ws.send(JSON.stringify({
            type: 'subscribed',
            clientId,
            channels: Array.from(client.channels),
          }))
        } else if (msg.type === 'unsubscribe' && Array.isArray(msg.channels)) {
          for (const channel of msg.channels) {
            broker.unsubscribe(clientId, channel)
          }
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            clientId,
            channels: Array.from(client.channels),
          }))
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        }
      } catch {}
    })

    ws.on('close', () => {
      broker.removeClient(clientId)
    })
  })
}

export function broadcastRealtimeEvent(channel: string, data: any, excludeClientId?: string): void {
  const message: Message = {
    type: 'event',
    channel,
    data,
  }
  broker.send(channel, message)
}

export function broadcastRecordEvent(
  action: 'create' | 'update' | 'delete',
  collectionId: string,
  record: any,
  excludeClientId?: string
): void {
  const channel = `collections.${collectionId}.records`
  broadcastRealtimeEvent(channel, {
    action,
    record,
    collectionId,
    timestamp: new Date().toISOString(),
  }, excludeClientId)
}

export function getBrokerStats(): { clients: number; channels: number } {
  return {
    clients: broker.getClientCount(),
    channels: broker.getChannelCount(),
  }
}

// FIXED[H-5]: Use crypto.randomBytes instead of Math.random()
function generateClientId(): string {
  const { randomBytes } = require('crypto')
  return `c_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
}
