# `@solarch/core-client` — Public API Surface Manifest

This manifest documents the exact mapping between `@solarch/core-client` kernel methods and Solarch backend endpoints.

---

## 1. Client Architecture Manifest

```text
SolarchClient
├── authStore: AuthStore
├── collection<T>(nameOrId: string): RecordService<T>
├── collections: CollectionService
├── files: FileService
├── realtime: RealtimeService
├── capabilities: CapabilityService
├── http: HttpClient
└── filter(template: string, params?: Record<string, any>): string
```

---

## 2. Kernel Methods & Backend Route Mapping

| Client Method | Target Endpoint | HTTP | Auth Requirement | Success Response | Error Behavior | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `collection(c).getList(page, perPage, opts)` | `/api/collections/:c/records` | `GET` | Optional / Rule-governed | `ListResult<T>` | `ClientResponseError` | Verified |
| `collection(c).getFullList(opts)` | `/api/collections/:c/records` | `GET` | Optional / Rule-governed | `T[]` (auto-batched) | `ClientResponseError` | Verified |
| `collection(c).getFirstListItem(filter, opts)` | `/api/collections/:c/records` | `GET` | Optional / Rule-governed | `T` (or throws 404) | `ClientResponseError` | Verified |
| `collection(c).getOne(id, opts)` | `/api/collections/:c/records/:id` | `GET` | Optional / Rule-governed | `T` | `ClientResponseError` | Verified |
| `collection(c).create(data, opts)` | `/api/collections/:c/records` | `POST` | Optional / Rule-governed | `T` | `ClientResponseError` | Verified |
| `collection(c).update(id, data, opts)` | `/api/collections/:c/records/:id` | `PATCH` | Optional / Rule-governed | `T` | `ClientResponseError` | Verified |
| `collection(c).delete(id, opts)` | `/api/collections/:c/records/:id` | `DELETE` | Optional / Rule-governed | `boolean` (204) | `ClientResponseError` | Verified |
| `collection(c).authWithPassword(identity, pwd)` | `/api/collections/:c/auth-with-password` | `POST` | Public | `RecordAuthResponse<T>` | `ClientResponseError` | Verified |
| `collection(c).authWithOAuth2(opts)` | `/api/collections/:c/auth-with-oauth2` | `POST` | Public | `RecordAuthResponse<T>` | `ClientResponseError` | Verified |
| `collection(c).authWithOtp(otpId, pwd)` | `/api/collections/:c/auth-with-otp` | `POST` | Public | `RecordAuthResponse<T>` | `ClientResponseError` | Verified |
| `collection(c).requestPasswordReset(email)` | `/api/collections/:c/request-password-reset` | `POST` | Public | `boolean` | `ClientResponseError` | Verified |
| `collection(c).confirmPasswordReset(token, ...)` | `/api/collections/:c/confirm-password-reset` | `POST` | Public | `boolean` | `ClientResponseError` | Verified |
| `collection(c).requestVerification(email)` | `/api/collections/:c/request-verification` | `POST` | Public | `boolean` | `ClientResponseError` | Verified |
| `collection(c).confirmVerification(token)` | `/api/collections/:c/confirm-verification` | `POST` | Public | `boolean` | `ClientResponseError` | Verified |
| `collection(c).requestEmailChange(newEmail)` | `/api/collections/:c/request-email-change` | `POST` | Authenticated | `boolean` | `ClientResponseError` | Verified |
| `collection(c).confirmEmailChange(token, pwd)` | `/api/collections/:c/confirm-email-change` | `POST` | Authenticated | `boolean` | `ClientResponseError` | Verified |
| `collection(c).subscribe(topic?, callback, opts)` | `/api/realtime` | WS / SSE | Optional / ViewRule | `() => void` (unsub) | WS Error frame | Verified |
| `collection(c).unsubscribe(topic?)` | `/api/realtime` | WS / SSE | None | `void` | None | Verified |
| `collections.getList(page, perPage, opts)` | `/api/collections` | `GET` | Superuser | `ListResult<CollectionModel>` | `ClientResponseError` | Verified |
| `collections.getOne(idOrName)` | `/api/collections/:id` | `GET` | Superuser | `CollectionModel` | `ClientResponseError` | Verified |
| `files.getUrl(record, filename, opts)` | `/api/files/:c/:id/:file` | Local/GET | Optional / Token | `string` (URL) | None | Verified |
| `files.getToken(c, id, filename)` | `/api/files/token` | `POST` | Authenticated | `string` (Token) | `ClientResponseError` | Verified |
| `capabilities.get()` | `/api/health` | `GET` | Public | `ServerCapabilities` | `ClientResponseError` | Verified |
| `filter(template, params)` | — | Local | None | Filter string | Throws on invalid | Verified |

---

## 3. Strict Boundary Enforcement

1. **Record Auth vs. Admin Auth:**
   - Record authentication updates `authStore` with `RecordModel`.
   - Superuser operations are segregated and explicit; normal client instances execute within the record-level security boundaries.
2. **Realtime Contract:**
   - Realtime channels accept collection names (`posts`) and canonical topics (`collections.<id>.records`).
   - Server broadcasts emit minimal metadata `{ action, collectionId, data: { id }, timestamp }`. Full record content is fetched over authorized REST when `autoFetch: true` is configured.
