---
title: "Realtime"
description: "Subscribe to live record mutation events via Server-Sent Events (SSE) and WebSockets."
slug: "features/realtime"
---

# Realtime

Solarch provides real-time record change notifications using Server-Sent Events (SSE) and WebSockets ([src/apis/realtime.ts](../../src/apis/realtime.ts)). When records are created, updated, or deleted, mutation events containing record identifiers are broadcast to authorized subscribers.

---

## Subscription Topic Format

Topics follow the pattern:
- `<collectionName>`: Subscribe to record mutation events for a collection (e.g. `posts`).
- `collections.<collectionId>.records`: Canonical channel identifier (e.g. `collections.col_123456789.records`).

---

## Event Payload Schema (Minimal Mutation Event)

Solarch follows a minimal-metadata event architecture. Raw record contents are **not** broadcast over the realtime channel; REST remains the sole authorization boundary for record data.

```json
{
  "type": "event",
  "channel": "collections.col_posts.records",
  "data": {
    "action": "create",
    "collectionId": "col_posts",
    "data": {
      "id": "rec123456789abc"
    },
    "timestamp": "2026-08-15T10:05:00.000Z"
  }
}
```

When receiving an event, clients fetch the full record via `GET /api/collections/:collection/records/:id` to retrieve authorized field data.

---

## 1. Realtime via WebSockets

Connect directly via WebSocket at `ws://localhost:8090/api/realtime?token=<auth_token>`.

```javascript
const ws = new WebSocket('ws://localhost:8090/api/realtime?token=' + authToken)

ws.onopen = () => {
  // Subscribe to one or more channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['posts']
  }))
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'connected') {
    console.log('Connected! Client ID:', msg.clientId, 'Protocol:', msg.protocolVersion)
  } else if (msg.type === 'event') {
    console.log('Action:', msg.data.action) // "create" | "update" | "delete"
    console.log('Record ID:', msg.data.data.id)
  }
}

// Keepalive ping
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }))
}, 30000)
```

---

## 2. Realtime via Server-Sent Events (SSE)

### Step 1: Connect to SSE Stream

```javascript
const eventSource = new EventSource('http://localhost:8090/api/realtime')

eventSource.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'connected') {
    const clientId = msg.clientId
    subscribeToChannels(clientId, ['posts'])
  } else if (msg.type === 'event') {
    console.log('Event:', msg.data)
  }
}
```

### Step 2: Register Subscriptions via HTTP POST

```javascript
async function subscribeToChannels(clientId, channels) {
  const subscriptions = channels.map(channel => ({ action: 'subscribe', channel }))
  await fetch('http://localhost:8090/api/realtime', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authToken
    },
    body: JSON.stringify({
      clientId,
      subscriptions
    })
  })
}
```
