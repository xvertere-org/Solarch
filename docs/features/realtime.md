---
title: "Realtime"
description: "Subscribe to live record changes via Server-Sent Events (SSE) and WebSockets."
slug: "features/realtime"
---

# Realtime

Solarch provides real-time record change notifications using Server-Sent Events (SSE) and WebSockets ([src/apis/realtime.ts](../../src/apis/realtime.ts)). Use it to push instant UI updates when records are created, updated, or deleted.

---

## Subscription Topic Format

Topics follow the structure:
- `collectionName`: Subscribe to all record events in a collection (e.g. `posts`).
- `collectionName/recordId`: Subscribe to events for a specific record (e.g. `posts/rec123456789abc`).
- `*`: Subscribe to all record changes across all collections.

---

## 1. Realtime via Server-Sent Events (SSE)

### Step 1: Connect to SSE Stream ([src/apis/realtime.ts:L30](../../src/apis/realtime.ts#L30))

```javascript
const eventSource = new EventSource('http://localhost:8090/api/realtime')

let clientSseId = ''

eventSource.addEventListener('PB_CONNECT', (e) => {
  const data = JSON.parse(e.data)
  clientSseId = data.clientId
  console.log('Connected SSE Client ID:', clientSseId)
  
  // Step 2: Set Subscriptions
  subscribeToTopics(clientSseId, ['posts'])
})

eventSource.addEventListener('posts', (e) => {
  const event = JSON.parse(e.data)
  console.log('Realtime Event Action:', event.action) // "create", "update", or "delete"
  console.log('Record Data:', event.record)
})
```

### Step 2: Register Topics ([src/apis/realtime.ts:L75](../../src/apis/realtime.ts#L75))

```javascript
async function subscribeToTopics(clientId, subscriptions) {
  await fetch('http://localhost:8090/api/realtime', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer USER_AUTH_TOKEN'
    },
    body: JSON.stringify({
      clientId: clientId,
      subscriptions: subscriptions
    })
  })
}
```

---

## 2. Realtime via WebSockets ([src/apis/realtime.ts:L180](../../src/apis/realtime.ts#L180))

Connect directly via WebSocket at `ws://localhost:8090/api/realtime`.

```javascript
const ws = new WebSocket('ws://localhost:8090/api/realtime')

ws.onopen = () => {
  // Subscribe to topics over WS
  ws.send(JSON.stringify({
    action: 'subscribe',
    subscriptions: ['posts'],
    token: 'USER_AUTH_TOKEN'
  }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log('WS Message Received:', message)
}
```

---

## Event Message Schema

When a record event triggers, subscriber clients receive a payload structured as:

```json
{
  "action": "create",
  "record": {
    "id": "rec123456789abc",
    "collectionId": "posts_coll_id",
    "collectionName": "posts",
    "title": "Realtime Update Demo",
    "created": "2026-07-25 10:05:00.000Z",
    "updated": "2026-07-25 10:05:00.000Z"
  }
}
```

---

## Common Errors

### Error: `Client ID is required.`
- **Cause**: Called `POST /api/realtime` without specifying `clientId` ([src/apis/realtime.ts:L80](../../src/apis/realtime.ts#L80)).
- **Fix**: Wait for the `PB_CONNECT` event in SSE to receive `clientId` before sending subscription requests.

### Error: `WebSocket connection failed.`
- **Cause**: Requesting WebSocket upgrade on a non-realtime endpoint.
- **Fix**: Ensure target URL matches `ws://localhost:8090/api/realtime`.
