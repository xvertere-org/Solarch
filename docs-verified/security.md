# Security

All security features documented here have been **verified through automated tests**.

---

## 1. SQL Injection Protection

All user-supplied identifiers (collection names, field names) are validated and quoted before use in SQL statements.

### Validation (`validateIdentifier`)

Identifiers must match: `^[a-zA-Z_][a-zA-Z0-9_]{0,62}$`

- Must start with a letter or underscore
- Only alphanumeric characters and underscores
- Maximum 63 characters

**Rejected payloads (tested):**
- `Robert'; DROP TABLE students;--`
- `field" OR 1=1 --`
- `id UNION SELECT * FROM users`
- `(SELECT password FROM users)`
- `field; DROP TABLE _collections`
- `field/*comment*/`
- `field\nDROP TABLE users`
- `field\0DROP`

### Quoting (`quoteIdentifier`)

All identifiers are wrapped in double-quotes with internal quotes escaped by doubling:
- `field` → `"field"`
- `my"field` → `"my""field"`

### Parameterized Queries (Filter Parser)

The filter parser (`src/tools/search/filter.ts`) produces parameterized SQL with `?` placeholders. User values are never interpolated into SQL strings:

```
Input:  name = "test'; DROP TABLE users; --"
Output: WHERE "name" = ?
Params: ["test'; DROP TABLE users; --"]
```

The `DROP TABLE` string is safely contained in a parameter, never in the SQL statement itself.

### Sort Validation

Sort field names are validated through `validateIdentifier` before being used in `ORDER BY` clauses.

**Test evidence:** `sql_injection.test.ts` → 20+ tests covering Bobby Tables, UNION injection, comment injection, null bytes, newlines, length limits, and filter/sort builder safety.

---

## 2. Password Hash Protection

The `passwordHash` field is **never exposed** in API responses, regardless of how the request is constructed.

### Automatic Hiding

For all auth-type collections, `passwordHash` is stripped during record enrichment:

```typescript
record.hide('passwordHash')
record.hide('lastResetSentAt')
record.hide('lastVerificationSentAt')
```

### Injection Prevention

Attempts to set `passwordHash` directly are blocked:

```http
POST /api/collections/users/records
{
  "email": "attacker@evil.com",
  "password": "test1234",
  "passwordConfirm": "test1234",
  "passwordHash": "$2b$10$malicious_hash"
}
```

The `passwordHash` field in the body is ignored. The system always computes the hash from `password`.

The `+passwordHash` modifier syntax (attempting to force-include hidden fields) is also blocked.

**Test evidence:** `new_issue.test.ts` → "NEW-001: passwordHash injection blocked" (both direct and `+passwordHash`), "NEW-002: passwordHash hidden"

---

## 3. Old Password Verification

When changing a password via record update, the `oldPassword` field is **required**:

| Scenario | Result |
|----------|--------|
| Correct `oldPassword` | ✅ Password updated |
| Wrong `oldPassword` | ❌ `400 Invalid old password` |
| Missing `oldPassword` | ❌ `400 Old password is required` |
| Empty `oldPassword` | ❌ `400 Old password is required` |
| New record creation | ✅ No `oldPassword` needed |
| Update without password fields | ✅ No `oldPassword` needed |

**Test evidence:** `security.test.ts` → "BUG-006: oldPassword verification" (6 sub-tests)

---

## 4. Token Revocation

Tokens are single-use for sensitive operations:

- **Admin token refresh:** Old token is revoked after issuing a new one. Using the revoked token returns `401`.
- **Password reset tokens:** Consumed after use; cannot be replayed.
- **Email change tokens:** Consumed after use.

Revoked tokens are tracked in the `_tokens` table. The `loadAuthToken` middleware checks token validity on every request.

**Test evidence:** `admin_auth.test.ts` → "revoked token → 401", password reset E2E flow (token consumed after use)
