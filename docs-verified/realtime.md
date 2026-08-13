# Realtime

## Channel Authorization

**Verified working** — subscription requests are checked against collection access rules.

---

### How It Works

When a client subscribes to a realtime channel (via WebSocket or SSE), the server validates whether the client has permission to receive events from that channel.

### Channel Format

Channels follow the pattern: `<collectionId>` or `<collectionName>`

### Authorization Logic

1. The client's auth token is validated (from WS query param `token` or header).
2. The collection's `viewRule` is evaluated against the authenticated user.
3. If `viewRule` is:
   - `""` (empty) → subscription allowed for everyone
   - `null` → subscription denied (except admins)
   - A rule expression → evaluated using `RecordFieldResolver`
4. Admin users **always bypass** rule checks.

### WebSocket Subscription

```javascript
const ws = new WebSocket('ws://localhost:8090/ws?token=<auth_token>')

// Subscribe to a collection channel
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'posts'
}))

// Receive events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // data.type: 'create' | 'update' | 'delete'
  // data.channel: 'posts'
  // data.data: { id: '...', ... }
}

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'posts'
}))

// Ping/pong keepalive
ws.send(JSON.stringify({ type: 'ping' }))
```

### Rejected Subscriptions

If the client doesn't have permission, the server responds with:

```json
{
  "type": "error",
  "channel": "posts",
  "data": {
    "code": 403,
    "message": "Access denied."
  }
}
```

**Test evidence:** `new_issue.test.ts` → "SEC-008: WebSocket realtime channel subscription authentication" — verifies that unauthorized subscriptions are properly rejected.
