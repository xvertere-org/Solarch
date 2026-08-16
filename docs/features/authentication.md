---
title: "Authentication"
description: "Configure Superuser auth, Record auth (Password, OAuth2, OTP, MFA), and token management."
slug: "features/authentication"
---

# Authentication

Solarch provides built-in authentication for superusers and auth collections. Use it to implement login, user signup, OAuth2 integration, One-Time Password (OTP) login, Multi-Factor Authentication (MFA), and session token lifecycle management.

---

## 1. Superuser Authentication

Superusers (formerly admins) manage system settings, collections, and server resources.

### Login with Username & Password ([src/apis/admin_auth.ts:L48](../../src/apis/admin_auth.ts#L48))

```bash
curl -X POST http://localhost:8090/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "admin",
    "password": "SecretPassword123"
  }'
```

#### Expected Output
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "superuser_id",
    "username": "admin"
  }
}
```

---

## 2. User / Record Authentication

Auth collections (such as `users`) handle end-user authentication.

### Login with Password ([src/apis/record_auth.ts:L48](../../src/apis/record_auth.ts#L48))

```bash
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user@example.com",
    "password": "userpassword123"
  }'
```

#### Expected Output
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "record": {
    "id": "abc123456789xyz",
    "collectionId": "users_collection_id",
    "email": "user@example.com",
    "verified": true
  }
}
```

---

### Fetch Auth Methods ([src/apis/record_auth.ts:L500](../../src/apis/record_auth.ts#L500))

Retrieve enabled auth providers (OAuth2, OTP, MFA status) for a collection.

```bash
curl -X GET http://localhost:8090/api/collections/users/methods
```

#### Expected Output
```json
{
  "authMethods": [
    {
      "name": "users",
      "collectionId": "users_collection_id",
      "allowPasswordAuth": true,
      "allowOAuth2Auth": true,
      "allowOTPAuth": true,
      "oauth2Providers": [
        {
          "name": "github",
          "displayName": "GitHub",
          "authURL": "https://github.com/login/oauth/authorize?client_id=...",
          "pkce": false
        }
      ]
    }
  ],
  "mfa": { "enabled": true },
  "otp": { "enabled": true }
}
```

---

### One-Time Password (OTP) Authentication ([src/apis/record_auth.ts:L290](../../src/apis/record_auth.ts#L290))

#### Step 1: Request OTP Code
```bash
curl -X POST http://localhost:8090/api/collections/users/request-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com" }'
```

#### Step 2: Authenticate with OTP Code
```bash
curl -X POST http://localhost:8090/api/collections/users/auth-with-otp \
  -H "Content-Type: application/json" \
  -d '{
    "otpId": "otp_id_returned_from_step_1",
    "password": "123456"
  }'
```

---

### Multi-Factor Authentication (MFA) TOTP ([src/apis/record_auth.ts:L390](../../src/apis/record_auth.ts#L390))

#### Setup MFA TOTP Secret
```bash
curl -X POST http://localhost:8090/api/collections/users/mfa/setup \
  -H "Authorization: Bearer USER_AUTH_TOKEN"
```

#### Verify MFA TOTP Code
```bash
curl -X POST http://localhost:8090/api/collections/users/mfa/verify \
  -H "Authorization: Bearer USER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "code": "654321" }'
```

---

## 3. Account Impersonation ([src/apis/auth_flows.ts:L250](../../src/apis/auth_flows.ts#L250))

Superusers can generate an auth token on behalf of any record for troubleshooting.

```bash
curl -X POST http://localhost:8090/api/collections/users/impersonate/RECORD_ID \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN"
```

---

## Common Errors

### Error: `Account temporarily locked. Try again later.`
- **Cause**: Exceeded 10 failed login attempts within 15 minutes ([src/apis/admin_auth.ts:L56](../../src/apis/admin_auth.ts#L56)).
- **Fix**: Wait 15 minutes for the IP lockout window to expire or restart the server instance.

### Error: `Invalid credentials.`
- **Cause**: Incorrect identity (email/username) or password supplied ([src/apis/admin_auth.ts:L70](../../src/apis/admin_auth.ts#L70)).
- **Fix**: Verify user credentials in the database or issue a password reset request.
