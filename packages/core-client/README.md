# `@solarch/core-client`

The official TypeScript client SDK for [Solarch](https://solarch.in/) — a self-hosted backend-as-a-service with realtime, authentication, collections, file storage, and more.

## Features

- **Universal** — works in Node.js, browsers, Cloudflare Workers, Deno, and any modern JavaScript runtime
- **Zero runtime dependencies** — no external packages required
- **Dual CJS + ESM** — works with `require()` and `import`
- **Full TypeScript** — typed API surface with declaration files included
- **Realtime** — SSE and WebSocket transport support
- **Auth-aware** — JWT management, token expiry, and browser-persistent auth store built in

---

## Installation

```bash
npm install @solarch/core-client
```

```bash
yarn add @solarch/core-client
```

```bash
pnpm add @solarch/core-client
```

---

## Quick Start

### Initialize the client

```ts
import { SolarchClient } from '@solarch/core-client'

const client = new SolarchClient('https://your-solarch-server.example.com')
```

For browser applications, persist the auth session across page reloads:

```ts
import { SolarchClient, LocalAuthStore } from '@solarch/core-client'

const client = new SolarchClient('https://your-solarch-server.example.com', {
  authStore: new LocalAuthStore('my_app_auth'),
})
```

---

## Authentication

### Authenticate a user (record auth)

```ts
const authResponse = await client.collection('users').authWithPassword(
  'user@example.com',
  'password123'
)

console.log(authResponse.token)   // JWT
console.log(authResponse.record)  // user record
```

### Check auth state

```ts
const isLoggedIn = client.authStore.isValid()  // true if token is present and not expired
const token = client.authStore.getToken()
const user = client.authStore.getModel()
```

### Subscribe to auth changes

```ts
const unsubscribe = client.authStore.subscribe((token, model) => {
  console.log('Auth changed:', !!token)
})

// Later:
unsubscribe()
```

### Sign out

```ts
client.authStore.clear()
```

---

## Working with Collections

### List records

```ts
const result = await client.collection('posts').getList(1, 20, {
  filter: 'published = true',
  sort: '-created',
})

console.log(result.items)       // RecordModel[]
console.log(result.totalItems)  // number
```

### Fetch all records (auto-paginated)

```ts
const posts = await client.collection('posts').getFullList({
  sort: 'created',
})
```

### Get a single record

```ts
const post = await client.collection('posts').getOne('RECORD_ID')
```

### Create a record

```ts
const newPost = await client.collection('posts').create({
  title: 'Hello World',
  body: 'First post!',
})
```

### Update a record

```ts
const updated = await client.collection('posts').update('RECORD_ID', {
  title: 'Updated Title',
})
```

### Delete a record

```ts
await client.collection('posts').delete('RECORD_ID')
```

---

## Realtime Subscriptions

```ts
// Subscribe to all changes in a collection
const unsubscribe = await client.collection('posts').subscribe('*', (event) => {
  console.log(event.action)  // 'create' | 'update' | 'delete'
  console.log(event.record)  // the affected record
})

// Subscribe to a specific record
await client.collection('posts').subscribe('RECORD_ID', (event) => {
  console.log('Record changed:', event.record)
})

// Unsubscribe
unsubscribe()
```

---

## Filter Helper

Build safe, parameterized filter strings:

```ts
import { filter } from '@solarch/core-client'

const q = filter('title = {:title} && status = {:status}', {
  title: 'Hello World',
  status: 'published',
})
// → 'title = "Hello World" && status = "published"'
```

---

## File URLs

```ts
const url = client.files.getUrl(record, 'avatar.jpg')
// → https://your-server.example.com/api/files/users/RECORD_ID/avatar.jpg
```

---

## Collections Metadata

```ts
const collections = await client.collections.getList()
const collection = await client.collections.getOne('posts')
```

---

## Module System Support

| Environment | Import style |
|---|---|
| ESM (bundlers, Deno, modern Node) | `import { SolarchClient } from '@solarch/core-client'` |
| CommonJS (legacy Node, Jest) | `const { SolarchClient } = require('@solarch/core-client')` |

---

## TypeScript

Full type support is included. No `@types/*` packages needed.

```ts
import type { RecordModel, ListResult, AuthModel } from '@solarch/core-client'

interface Post extends RecordModel {
  title: string
  body: string
  published: boolean
}

const result: ListResult<Post> = await client.collection<Post>('posts').getList(1, 10)
```

---

## Error Handling

All client methods throw `ClientResponseError` on failure:

```ts
import { ClientResponseError } from '@solarch/core-client'

try {
  await client.collection('posts').getOne('nonexistent')
} catch (err) {
  if (err instanceof ClientResponseError) {
    console.log(err.status)   // HTTP status code
    console.log(err.message)  // error message
    console.log(err.data)     // structured error payload
  }
}
```

---

## Server Capabilities

```ts
const caps = await client.capabilities.get()
console.log(caps.version)
```

---

## Requirements

- Node.js `>=20.0.0` (for Node environments)
- Any modern browser with `fetch` support

---

## Documentation

- [Solarch Documentation](https://solarch.in/)
- [REST API Reference](https://github.com/xvertere-org/Solarch/blob/main/docs/reference/rest-api.md)
- [Changelog](./CHANGELOG.md)

---

## License

[Apache-2.0](./LICENSE)
