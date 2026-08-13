# Records

All record features documented here have been **verified through automated tests**.

---

## 1. Create Record

```http
POST /api/collections/:collectionIdOrName/records
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!",
  "username": "johndoe"
}
```

**Response (201):**

```json
{
  "id": "rec_abc123",
  "email": "user@example.com",
  "username": "johndoe",
  "collectionId": "...",
  "collectionName": "users",
  "created": "2026-01-01T00:00:00.000Z",
  "updated": "2026-01-01T00:00:00.000Z"
}
```

### Behavior

- **Access rules:** If `createRule` is `null`, returns `403`. If non-empty, the rule is evaluated against the new record and request context.
- **Validation:** Runs `validateAndCreateRecord` which checks required fields, types, min/max constraints, and uniqueness.
- **Auth collections:** Returns a JWT `token` alongside the `record` (unless `onlyVerified = true`).
- **Realtime:** Broadcasts a `create` event to subscribed clients.
- **Unique violations:** SQLite UNIQUE constraint errors return `400` with `{ field: "email", message: "Value must be unique." }`.

### Security

- `passwordHash` is **never returned** in responses, even if explicitly requested.
- Attempting to set `passwordHash` directly in the request body is silently blocked.

**Test evidence:** `record_auth.test.ts` → "Registration: Valid creation", "Registration: Edge Cases (duplicate email)". `new_issue.test.ts` → "passwordHash injection blocked", "passwordHash hidden".

---

## 2. Update Record

```http
PATCH /api/collections/:collectionIdOrName/records/:recordId
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "updated_name"
}
```

**Response (200):**

```json
{
  "id": "rec_abc123",
  "username": "updated_name",
  ...
}
```

### Password Changes

To change a password, the `oldPassword` field **must** be provided:

```json
{
  "oldPassword": "CurrentPassword123!",
  "password": "NewPassword456!",
  "passwordConfirm": "NewPassword456!"
}
```

**Verification rules:**
- Missing `oldPassword` → `400 Old password is required`
- Wrong `oldPassword` → `400 Invalid old password`
- Empty `oldPassword` → `400 Old password is required`
- Correct `oldPassword` → password updated successfully
- Update without password fields → allowed (no `oldPassword` needed)

**Test evidence:** `security.test.ts` → "BUG-006: oldPassword verification" (6 sub-tests covering all edge cases)

### Access Rules

- `updateRule = null` → `403 Access denied`
- `updateRule = ""` (empty string) → open access
- `updateRule = "@request.auth.id = id"` → only the record owner can update

---

## 3. Record Enrichment

Records are enriched before being returned to the client. This includes expanding relations, filtering fields, and hiding sensitive data.

### Expand Relations

```http
GET /api/collections/posts/records/rec_123?expand=author,comments
```

Expands `relation` fields by fetching the linked records. Supports nested expansion:

```http
GET /api/collections/posts/records/rec_123?expand=author.profile
```

The expanded data appears under an `expand` key in the response:

```json
{
  "id": "rec_123",
  "title": "My Post",
  "author": "user_abc",
  "expand": {
    "author": {
      "id": "user_abc",
      "name": "John"
    }
  }
}
```

### Field Filtering

```http
GET /api/collections/users/records?fields=id,email,username
```

Only the specified fields (plus system fields `id`, `created`, `updated`, `collectionId`, `collectionName`) are returned. All other fields are hidden.

### Automatic Hiding (Auth Collections)

For auth-type collections, the following fields are **always** hidden from responses:

- `passwordHash`
- `lastResetSentAt`
- `lastVerificationSentAt`

The `email` field is hidden unless:
- The request is from an admin, **or**
- The record has `emailVisibility = true`

**Test evidence:** `new_issue.test.ts` → "BUG-001: expandRecord", "NEW-002: passwordHash hidden"

---

## 4. Access Rules

Every collection has 5 access rules that control who can perform each operation:

| Rule | Controls |
|------|----------|
| `listRule` | Who can list records |
| `viewRule` | Who can view a single record |
| `createRule` | Who can create records |
| `updateRule` | Who can update records |
| `deleteRule` | Who can delete records |

### Rule Syntax

| Value | Meaning |
|-------|---------|
| `""` (empty string) | Open access — anyone can perform the action |
| `null` | Locked — no one can perform the action (except admins) |
| `"@request.auth.id = id"` | Only the record owner |
| `"@request.auth.id != ''"` | Any authenticated user |

### Macros

| Macro | Resolves To |
|-------|-------------|
| `@request.auth.id` | Authenticated user's record ID |
| `@request.auth.isAdmin` | `true` if the request is from an admin |
| `@request.data.*` | Request body fields |
| `@request.query.*` | Query parameters |
| `@request.headers.*` | Request headers |

### Admin Bypass

Admin/superuser requests **always bypass** access rules (return `true`).

**Test evidence:** Multiple tests exercise rule evaluation — realtime subscription auth (`new_issue.test.ts` SEC-008), record creation access.
