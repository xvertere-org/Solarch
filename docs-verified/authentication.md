# Authentication

All authentication features documented here have been **verified through automated tests**.

---

## 1. Password Authentication

### Login

```http
POST /api/collections/:collectionIdOrName/auth-with-password
Content-Type: application/json

{
  "identity": "user@example.com",
  "password": "ValidPassword123!"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "record": {
    "id": "abc123",
    "email": "user@example.com",
    "collectionId": "...",
    "collectionName": "users",
    "created": "2026-01-01T00:00:00.000Z",
    "updated": "2026-01-01T00:00:00.000Z"
  }
}
```

**Identity field:** Can be email or username (resolved in order: email → username).

**Rate limiting:** 5 requests per 15 minutes per IP. After 10 failed attempts, the account is locked out temporarily.

**Verified email gating:** If the auth collection has `authOptions.onlyVerified = true`, unverified users receive `403 Email not verified.`

**Test evidence:** `record_auth.test.ts` → "Login: Valid credentials", "Unverified users rejection"

### Registration

```http
POST /api/collections/:collectionIdOrName/records
Content-Type: application/json

{
  "email": "new@example.com",
  "password": "ValidPassword123!",
  "passwordConfirm": "ValidPassword123!",
  "username": "newuser"
}
```

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "record": {
    "id": "...",
    "email": "new@example.com",
    "username": "newuser"
  }
}
```

- `passwordHash` is **never** exposed in responses.
- Duplicate email returns `400` with `{ field: "email", message: "Value must be unique." }`.
- Minimum password length is enforced from `authOptions.minPasswordLength` (default: 8).
- A JWT token is returned on creation unless `authOptions.onlyVerified = true`.

**Test evidence:** `record_auth.test.ts` → "Registration: Valid creation", "Edge Cases (duplicate email)"

---

## 2. OTP Authentication

### Request OTP

```http
POST /api/collections/:collectionIdOrName/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "otpId": "otp_abc123..."
}
```

A 6-digit OTP is generated and sent via email (requires SMTP configuration). The OTP is stored as a SHA-256 hash in the `_otps` table with a 10-minute expiry.

**Rate limiting:** 3 requests per hour per IP.

### Verify OTP

```http
POST /api/collections/:collectionIdOrName/auth-with-otp
Content-Type: application/json

{
  "otpId": "otp_abc123...",
  "password": "123456"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "record": { ... }
}
```

- OTP is verified using `crypto.timingSafeEqual` (timing-attack resistant).
- OTP is single-use — deleted after successful verification.
- Expired OTPs are cleaned up automatically.

**Rate limiting:** 5 attempts per minute per IP.

**Test evidence:** `record_auth.test.ts` → "OTP Auth flow: Request and Verify"

---

## 3. MFA / TOTP (Two-Factor Authentication)

### Setup TOTP

Requires an authenticated user (Bearer token).

```http
POST /api/collections/:collectionIdOrName/mfa/setup
Authorization: Bearer <auth_token>
```

**Response (200):**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "otpauth://totp/Solarch:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Solarch",
  "backupCodes": ["abc123", "def456", "ghi789", ...]
}
```

- Secret is a random 20-byte base32-encoded string.
- 8 backup codes are generated (each 6 hex characters).
- Stored in the `_mfas` table.

### Login with MFA

After MFA is enabled, password login returns an intermediate response:

```json
{
  "mfaRequired": true,
  "token": "<mfa_challenge_token>"
}
```

Then verify with:

```http
POST /api/collections/:collectionIdOrName/mfa/verify
Content-Type: application/json

{
  "mfaToken": "<mfa_challenge_token>",
  "code": "123456"
}
```

**Response (200):** Full auth token + record (same shape as password login).

The TOTP code is validated using HMAC-SHA1 per RFC 6238 (30-second window, 6 digits).

**Test evidence:** `record_auth.test.ts` → "MFA/TOTP setup & verify"

---

## 4. Admin / Superuser Authentication

### Login

```http
POST /api/admins/auth-with-password
Content-Type: application/json

{
  "identity": "admin@example.com",
  "password": "AdminPassword123!"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "su_...",
    "email": "admin@example.com"
  }
}
```

**Rate limiting:** 10 requests per 15 minutes. After 10 failed attempts, the account is locked.

**Test evidence:** `admin_auth.test.ts` → "Login: invalid credentials → 400", "Brute-force: lock out after 10 failed attempts"

### Token Refresh

```http
POST /api/admins/auth-refresh
Authorization: Bearer <admin_token>
```

**Response (200):** New token issued, old token revoked.

**Error cases:**
- Revoked token → `401`
- Expired token → `401`

**Test evidence:** `admin_auth.test.ts` → "Token Refresh: valid token → returns new token", "revoked token → 401", "expired token → 401"

### Password Reset

**Step 1 — Request reset:**

```http
POST /api/admins/request-password-reset
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

Returns `200` with an opaque reset token (in practice sent via email).

**Step 2 — Confirm reset:**

```http
POST /api/admins/confirm-password-reset
Content-Type: application/json

{
  "token": "<reset_token>",
  "password": "NewPassword123!",
  "passwordConfirm": "NewPassword123!"
}
```

- Minimum 10 characters for admin passwords.
- Token is single-use (revoked after use).

**Test evidence:** `admin_auth.test.ts` → "Password Reset: E2E flow"

---

## 5. Token Refresh (Record Auth)

```http
POST /api/collections/:collectionIdOrName/auth-refresh
Authorization: Bearer <auth_token>
```

Issues a new JWT and revokes the old one. Rate-limited.

**Source:** `src/apis/record_auth.ts:367-397`

---

## 6. User Password Reset

**Step 1 — Request:**

```http
POST /api/collections/:collectionIdOrName/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Step 2 — Confirm:**

```http
POST /api/collections/:collectionIdOrName/confirm-password-reset
Content-Type: application/json

{
  "token": "<reset_token>",
  "password": "NewPassword123!",
  "passwordConfirm": "NewPassword123!"
}
```

- Minimum password length enforced from `authOptions.minPasswordLength`.
- Token is single-use.

**Test evidence:** `auth_flows.test.ts` → "Password reset: E2E flow"

---

## 7. Email Change

**Step 1 — Request:**

```http
POST /api/collections/:collectionIdOrName/request-email-change
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "newEmail": "newemail@example.com"
}
```

**Step 2 — Confirm:**

```http
POST /api/collections/:collectionIdOrName/confirm-email-change
Content-Type: application/json

{
  "token": "<change_token>"
}
```

- Checks uniqueness of new email before applying.
- Changing to an email that already exists returns `400` (not `500`).

**Test evidence:** `auth_flows.test.ts` → "Change email: E2E flow", `new_issue.test.ts` → "email change to existing email returns 400 not 500"

---

## 8. Impersonation

Admin-only. Generates a 1-hour auth token for any user.

```http
POST /api/collections/:collectionIdOrName/impersonate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "recordId": "<user_record_id>"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

- Non-admin requests receive `403`.

**Test evidence:** `auth_flows.test.ts` → "Impersonation: admin can impersonate, user cannot"

---

## 9. JWT Middleware

All requests pass through `loadAuthToken` middleware, which:

1. Extracts the `Authorization: Bearer <token>` header.
2. Validates the JWT against the app's secret.
3. Sets `req.authContext` with:
   - `record` — the authenticated user record (or `null`)
   - `isAdmin` — `true` if token has admin payload
   - `token` — the raw token string

Subsequent route handlers check `req.authContext` for authorization.

**Test evidence:** `auth_middleware.test.ts`
