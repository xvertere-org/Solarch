import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { createApiError } from '../utils/api_errors'
import { Broker, Client, RealtimeAuthContext } from '../tools/subscriptions/broker'
import { WebSocket } from 'ws'
import { canAccessRecord } from './record_helpers'
import { RecordModel as PBRecord } from '../core/record'
import { Collection } from '../core/collection'
import { RequestInfo } from '../core/record_field_resolver'
import { quoteIdentifier } from '../utils/sql_safe'

const broker = new Broker()
const sseClients = new Map<string, Response>()

export function registerRealtimeRoutes(app: BaseApp, router: Router): void {
  router.get('/api/realtime', async (req: Request, res: Response) => {
    const clientId = req.query.clientId as string || generateClientId()
    const acceptHeader = req.headers.accept || ''

    if (acceptHeader.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      // Resolve auth context from Express middleware if available.
      // If middleware has not populated req.authContext the client is anonymous.
      // Never assume authenticated; never discard an existing auth context.
      const sseAuthContext: RealtimeAuthContext = {
        record: (req as any).authContext?.record ?? null,
        isAdmin: (req as any).authContext?.isAdmin ?? false,
      }

      const client: Client = {
        id: clientId,
        channels: new Set(),
        authContext: sseAuthContext,
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

      client.send(JSON.stringify({ type: 'connected', clientId, protocolVersion: '1.0', authenticated: !!(sseAuthContext.record || sseAuthContext.isAdmin) }))
    } else {
      res.json({
        code: 200,
        message: 'Realtime endpoint. Use WebSocket connection at ws://host:port/api/realtime or SSE at /api/realtime with Accept: text/event-stream',
        clientId,
      })
    }
  })


  router.post('/api/realtime', async (req: Request, res: Response) => {
    try {
      const { clientId, subscriptions } = req.body
      if (!clientId || !Array.isArray(subscriptions)) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Invalid request. clientId and subscriptions array required.'))
      }

      const authRecord = req.authContext?.record ?? null
      const isAdmin = req.authContext?.isAdmin ?? false

      const subscribedChannels: string[] = []
      const errors: { channel: string; message: string }[] = []

      for (const sub of subscriptions) {
        if (sub.action === 'subscribe') {
          const allowed = await canSubscribeToChannel(app, sub.channel, authRecord, isAdmin)
          if (allowed) {
            broker.subscribe(clientId, sub.channel)
            const canonical = getCanonicalChannel(app, sub.channel)
            if (canonical && canonical !== sub.channel) {
              broker.subscribe(clientId, canonical)
            }
            subscribedChannels.push(sub.channel)
          } else {
            errors.push({ channel: sub.channel, message: `Not authorized to subscribe to channel: ${sub.channel}` })
          }
        } else if (sub.action === 'unsubscribe') {
          broker.unsubscribe(clientId, sub.channel)
          const canonical = getCanonicalChannel(app, sub.channel)
          if (canonical && canonical !== sub.channel) {
            broker.unsubscribe(clientId, canonical)
          }
        }
      }

      if (errors.length > 0 && subscribedChannels.length === 0) {
        return res.status(403).json({
          code: 403,
          clientId,
          message: 'Subscription denied.',
          errors,
        })
      }

      res.json({
        code: 200,
        clientId,
        subscriptions: subscribedChannels,
        ...(errors.length > 0 ? { errors } : {}),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
}

export function resolveCollectionFromChannel(app: BaseApp, channel: string) {
  let target = channel
  if (target.startsWith('collections.') && target.endsWith('.records')) {
    target = target.slice('collections.'.length, -('.records'.length))
  }
  return app.findCachedCollectionByNameOrId(target)
}

export function getCanonicalChannel(app: BaseApp, channel: string): string | null {
  const collection = resolveCollectionFromChannel(app, channel)
  if (collection) {
    return `collections.${collection.id}.records`
  }
  return null
}

async function canSubscribeToChannel(
  app: BaseApp,
  channel: string,
  authRecord: PBRecord | null,
  isAdmin: boolean
): Promise<boolean> {

  if (isAdmin) return true

  const collection = resolveCollectionFromChannel(app, channel)
  if (collection) {
    // Locked collection: never subscribable.
    if (collection.viewRule === null) return false
    // Public collection: always subscribable.
    if (collection.viewRule === '') return true
    // Expression rule: allow subscription if the client is authenticated.
    // Per-record authorization is enforced at broadcast time in broadcastRecordEvent.
    // Evaluating the expression here against the auth user object (not a record)
    // would produce incorrect results and block legitimate owners.
    return authRecord !== null
  }

  return !!(authRecord || isAdmin)
}

export function setupWebSocketRealtime(wss: any, app?: BaseApp): void {
  wss.on('connection', async (ws: WebSocket, req?: any) => {
    const clientId = generateClientId()
    const client: Client = {
      id: clientId,
      channels: new Set(),
      // Placeholder — overwritten after JWT resolution below.
      authContext: { record: null, isAdmin: false },
      send: (message: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message)
        }
      },
      close: () => {
        ws.close()
      },
    }

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
              const collection = app.findCachedCollectionByNameOrId(payload.collectionId)
              if (collection) {
                const row = await app.db().queryOne<any>(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`, [payload.id])
                if (row) {
                  authRecord = new PBRecord(collection.id, collection.name, row)
                }
              }
            }
          }
        }
      } catch {
      }
    }

    // Store resolved auth context on client; overrides the placeholder set above.
    client.authContext = { record: authRecord, isAdmin }
    broker.addClient(client)

    ws.send(JSON.stringify({ type: 'connected', clientId, protocolVersion: '1.0', authenticated: !!(authRecord || isAdmin) }))

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          (async () => {
            for (const channel of msg.channels) {
              let allowed = true
              if (app) {
                allowed = await canSubscribeToChannel(app, channel, authRecord, isAdmin)
              }
              if (!allowed) {
                ws.send(JSON.stringify({ type: 'error', message: `Not authorized to subscribe to channel: ${channel}` }))
                continue
              }
              broker.subscribe(clientId, channel)
              if (app) {
                const canonical = getCanonicalChannel(app, channel)
                if (canonical && canonical !== channel) {
                  broker.subscribe(clientId, canonical)
                }
              }
            }
            ws.send(JSON.stringify({
              type: 'subscribed',
              clientId,
              channels: Array.from(client.channels),
            }))
          })().catch(() => {})
        } else if (msg.type === 'unsubscribe' && Array.isArray(msg.channels)) {
          for (const channel of msg.channels) {
            broker.unsubscribe(clientId, channel)
            if (app) {
              const canonical = getCanonicalChannel(app, channel)
              if (canonical && canonical !== channel) {
                broker.unsubscribe(clientId, canonical)
              }
            }
          }
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            clientId,
            channels: Array.from(client.channels),
          }))
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        }
      } catch { }
    })

    ws.on('close', () => {
      broker.removeClient(clientId)
    })
  })
}

export function broadcastRealtimeEvent(channel: string, data: any, excludeClientId?: string): void {
  const message = {
    type: 'event',
    channel,
    data,
  }
  broker.send(channel, message)
}

/**
 * Broadcasts a record mutation event to all subscribers who are authorized
 * to view the specific record that changed.
 *
 * Two-stage authorization model:
 *   Stage 1 (subscription): collection-level gate — locked=deny, public=allow,
 *                           expression=allow-if-authenticated.
 *   Stage 2 (here): per-record viewRule evaluated against the actual mutated
 *                   record and each subscriber's stored auth context.
 *
 * This prevents both full-field leakage and existence-metadata leakage to
 * unauthorized subscribers, while ensuring owners receive their own events.
 */
export async function broadcastRecordEvent(
  action: 'create' | 'update' | 'delete',
  collection: Collection,
  record: PBRecord,
  app: BaseApp,
): Promise<void> {
  const channel = `collections.${collection.id}.records`
  const subscribers = broker.getChannelSubscribers(channel)

  for (const clientId of subscribers) {
    const client = broker.getClient(clientId)
    if (!client) continue

    const requestInfo: RequestInfo = {
      auth: client.authContext.record,
      isAdmin: client.authContext.isAdmin,
      method: 'GET',
      headers: {}, query: {}, body: {}, data: {},
      context: 'view',
    }

    // Per-record authorization: only send event if the subscriber can view this record.
    // canAccessRecord: rule==='' → true (public), rule===null → false (locked),
    // expression → evaluated against the actual record + subscriber auth.
    const authorized = await canAccessRecord(
      app,
      record,
      collection,
      collection.viewRule,
      requestInfo,
    )

    if (!authorized) continue

    const payload = JSON.stringify({
      type: 'event',
      channel,
      data: {
        action,
        collectionId: collection.id,
        data: { id: record.id },
        timestamp: new Date().toISOString(),
      },
    })
    try {
      client.send(payload)
    } catch {
      broker.removeClient(clientId)
    }
  }
}

export function getBrokerStats(): { clients: number; channels: number } {
  return {
    clients: broker.getClientCount(),
    channels: broker.getChannelCount(),
  }
}

function generateClientId(): string {
  const { randomBytes } = require('crypto')
  return `c_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
}
