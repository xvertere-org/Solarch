# Realtime

## Protocol & Channel Authorization

**Verified working** — subscription requests are checked against collection access rules and events emit minimal mutation metadata.

---

### How It Works

1. Clients connect via WebSocket (`/api/realtime`) or SSE (`/api/realtime` with `Accept: text/event-stream`).
2. Clients subscribe to channels: either by collection name (e.g. `posts`) or canonical identifier (`collections.<collectionId>.records`).
3. The server validates subscription authorization against the collection's `viewRule`.
4. When mutations occur, the server broadcasts minimal mutation events `{ action, collectionId, data: { id }, timestamp }`.
5. Clients query the REST API with their auth token to retrieve full, authorized record contents.

---

### Channel Authorization Logic

1. The client's auth token is validated from query param `token` or `Authorization` header.
2. The collection's `viewRule` is evaluated against the authenticated user.
3. If `viewRule` is:
   - `""` (empty) → subscription allowed for everyone
   - `null` → subscription denied (except superusers)
   - Rule expression → evaluated via `RecordFieldResolver` with request auth context
4. Superusers always bypass rule checks.

---

### WebSocket Protocol Summary

- **Connection handshake:** `{ type: 'connected', clientId, protocolVersion: '1.0', authenticated: boolean }`
- **Subscribe:** `{ type: 'subscribe', channels: string[] }`
- **Subscribed confirmation:** `{ type: 'subscribed', clientId, channels: string[] }`
- **Unsubscribe:** `{ type: 'unsubscribe', channels: string[] }`
- **Unsubscribed confirmation:** `{ type: 'unsubscribed', clientId, channels: string[] }`
- **Ping / Pong:** `{ type: 'ping' }` → `{ type: 'pong', timestamp: number }`
- **Event message:** `{ type: 'event', channel, data: { action, collectionId, data: { id }, timestamp } }`
- **Error message:** `{ type: 'error', message: string }`
