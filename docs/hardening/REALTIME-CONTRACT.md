# Solarch Realtime Provider & Transport Contract (`REALTIME-CONTRACT.md`)

This document defines the separation of concerns between pub/sub distribution (`RealtimeProvider`) and client network connection management (`RealtimeTransport`).

---

## 1. Architectural Separation

```text
                  Client (Browser / SDK)
                            │
                   WebSocket / SSE
                            │
                            ▼
              ┌───────────────────────────┐
              │     RealtimeTransport     │
              │  (Connection, Auth, SSE)  │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    SubscriptionManager    │
              │         (Broker)          │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │     RealtimeProvider      │
              │   (Distributed Pub/Sub)   │
              └──────┬─────────────┬──────┘
                     │             │
                     ▼             ▼
                 InMemory        Redis /
                 Provider     Durable Objects
```

---

## 2. RealtimeProvider Contract

The `RealtimeProvider` is responsible solely for message broadcast and distributed pub/sub semantics:

```ts
export interface RealtimeProvider {
  /**
   * Publish a message to a specific channel.
   */
  publish(channel: string, message: Message): Promise<void>

  /**
   * Subscribe to messages on a specific channel.
   */
  subscribe(channel: string, handler: (message: Message) => void): Promise<void>

  /**
   * Unsubscribe a handler from a specific channel.
   */
  unsubscribe(channel: string, handler: (message: Message) => void): Promise<void>

  /**
   * Cleanly close provider connections.
   */
  close(): Promise<void>
}
```

### Guarantees
- **At-Least-Once / Best-Effort Delivery**: In-memory and distributed message delivery without message mutation.
- **Ordering**: Preservation of message dispatch sequence per channel.
- **Independence**: No transport-level coupling (e.g. no Express `Response`, WebSocket sockets, or HTTP headers inside the provider).

---

## 3. RealtimeTransport Contract

The `RealtimeTransport` manages client-facing network connections:
- Connection establishment (`/api/realtime` SSE or WebSocket).
- Authentication context resolution at handshake time (`RealtimeAuthContext`).
- Client-side keepalive pings / heartbeats.
- Reconnection and resubscription handling upon network interruption.
- Row-level event authorization filtering (`canAccessRecord`) before payload transmission to the client socket.
