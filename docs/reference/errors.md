---
title: "Error Reference"
description: "HTTP error status codes, codebase error formats, and resolution procedures."
slug: "reference/errors"
---

# Error Reference

Standard error response format and resolution guide derived directly from exceptions thrown across Solarch source code.

---

## Standard Error Response Schema

All API error responses return a standardized JSON structure:

```json
{
  "code": 400,
  "message": "Failed to create record.",
  "data": {
    "title": {
      "code": "validation_required",
      "message": "Missing required value."
    }
  }
}
```

---

## HTTP Status Codes & Codebase Exceptions

### `400 Bad Request`

#### 1. `Missing identity or password.`
- **Source**: [src/apis/admin_auth.ts:L52](../../src/apis/admin_auth.ts#L52)
- **Cause**: Posted login payload missing `identity` or `password` field.
- **Fix**: Ensure JSON body includes both properties: `{"identity": "...", "password": "..."}`.

#### 2. `Invalid credentials.`
- **Source**: [src/apis/admin_auth.ts:L64](../../src/apis/admin_auth.ts#L64)
- **Cause**: Superuser or user record matching the given email/username was not found, or password verification failed.
- **Fix**: Confirm account email or reset password.

#### 3. `Failed to create record.` / `Failed to update record.`
- **Source**: [src/core/record_upsert.ts:L85](../../src/core/record_upsert.ts#L85)
- **Cause**: Input payload failed collection schema field validation or unique constraint.
- **Fix**: Inspect the `data` error object in response to correct individual field errors.

---

### `401 Unauthorized`

#### 1. `Missing authorization header.`
- **Source**: [src/apis/admin_auth.ts:L99](../../src/apis/admin_auth.ts#L99)
- **Cause**: Endpoint requires authentication but no `Authorization` HTTP header was sent.
- **Fix**: Include header: `Authorization: Bearer <your_jwt_token>`.

#### 2. `Invalid or expired token.`
- **Source**: [src/apis/middlewares_auth.ts:L45](../../src/apis/middlewares_auth.ts#L45)
- **Cause**: JWT token has expired, signature key mismatched, or payload was corrupted.
- **Fix**: Re-authenticate via `/api/admins/auth-with-password` or `/api/collections/:c/auth-with-password` to obtain a fresh token.

---

### `403 Forbidden`

#### 1. `Only superusers can perform this action.`
- **Source**: [src/apis/middlewares_auth.ts:L75](../../src/apis/middlewares_auth.ts#L75)
- **Cause**: Admin/superuser privileges are required for system endpoints like collection management or backups.
- **Fix**: Authenticate using a superuser account instead of a standard collection record token.

#### 2. `You are not allowed to perform this action.`
- **Source**: [src/apis/record_helpers.ts:L110](../../src/apis/record_helpers.ts#L110)
- **Cause**: Collection access rule evaluated to `false` for the current user context.
- **Fix**: Update collection rule in Admin UI or provide requisite authentication context.

---

### `404 Not Found`

#### 1. `Collection not found.`
- **Source**: [src/apis/record_crud.ts:L19](../../src/apis/record_crud.ts#L19)
- **Cause**: Target collection name or collection ID in URL path does not exist.
- **Fix**: Verify collection name spelling in request URL.

#### 2. `The requested record doesn't exist.`
- **Source**: [src/apis/record_crud.ts:L115](../../src/apis/record_crud.ts#L115)
- **Cause**: Record ID specified in path URL was not found in the collection.
- **Fix**: Confirm record ID existence before performing GET/PATCH/DELETE calls.

---

### `429 Too Many Requests`

#### 1. `Too many authentication attempts, please try again later.`
- **Source**: [src/apis/admin_auth.ts:L20](../../src/apis/admin_auth.ts#L20)
- **Cause**: Exceeded 10 failed login attempts within 15 minutes.
- **Fix**: Wait 15 minutes for rate limit window reset.

---

### `500 Internal Server Error`

#### 1. `Internal server error`
- **Source**: [src/apis/serve.ts](../../src/apis/serve.ts)
- **Cause**: Unhandled runtime exception, database disk I/O error, or corruption.
- **Fix**: Check server logs in terminal or inspect SQLite database file permissions.
