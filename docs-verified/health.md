# Health Endpoint

**Verified working** — returns different responses for authenticated admins vs. public requests.

---

## Public Health Check

```http
GET /api/health
```

**Response (200):**

```json
{
  "status": "ok"
}
```

No authentication required. Returns a simple status if the database is reachable.

## Admin Health Check

```http
GET /api/health
Authorization: Bearer <admin_token>
```

**Response (200):**

```json
{
  "code": 200,
  "message": "Healthy",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "data": {
    "dbConnected": true
  }
}
```

Includes additional diagnostic information when the request is from an authenticated admin.

## Database Unavailable

If the database cannot execute `SELECT 1`:

**Response (503):**

```json
{
  "code": 503,
  "message": "Database unavailable",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

**Test evidence:** `backup.test.ts` → "GET /api/health returns ok for non-admin", "returns details for admin"
