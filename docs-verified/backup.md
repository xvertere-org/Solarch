# Backup & Restore

All backup features documented here have been **verified through automated tests**.

All endpoints require **superuser authentication** (`Authorization: Bearer <admin_token>`).

---

## 1. List Backups

```http
GET /api/backups
```

**Response (200):**

```json
[
  {
    "key": "test-backup.zip",
    "size": 45312,
    "modified": "2026-01-01T12:00:00.000Z"
  }
]
```

Returns an empty array `[]` if no backups exist.

**Test evidence:** `backup.test.ts` → "GET /api/backups returns empty list initially", "lists created backups"

---

## 2. Create Backup

```http
POST /api/backups
Content-Type: application/json

{
  "name": "my-backup"
}
```

**Response (200):**

```json
{
  "data": {
    "key": "my-backup.zip",
    "size": 45312
  }
}
```

### Behavior

- If `name` is omitted, an auto-generated name is used: `backup_<timestamp>.zip`.
- `.zip` extension is appended automatically.
- Creates a streaming zip containing the SQLite database files.
- Duplicate names return `409 Conflict`.

**Test evidence:** `backup.test.ts` → "creates a backup", "auto-generated name", "rejects duplicate name"

---

## 3. Delete Backup

```http
DELETE /api/backups/:key
```

**Response:** `204 No Content` on success.

- Returns `404` if the backup doesn't exist.
- The `:key` parameter is the backup filename (e.g., `my-backup.zip`). URL-encode if necessary.

**Test evidence:** `backup.test.ts` → "removes a backup", "returns 404 for missing backup"

---

## 4. Restore Backup

```http
POST /api/backups/:key/restore
```

**Response (200):**

```json
{
  "message": "Backup my-backup.zip restored successfully."
}
```

- Extracts the zip and overwrites the current database files.
- Returns `404` if the backup doesn't exist.

> ⚠️ **This is a destructive operation.** The current database is replaced with the backup contents.

**Test evidence:** `backup.test.ts` → "restores a backup", "returns 404 for missing backup"

---

## 5. Upload Backup

```http
POST /api/backups/upload
Content-Type: multipart/form-data

file: <zip file>
```

**Response (200):**

```json
{
  "data": {
    "key": "upload-test.zip"
  }
}
```

- Accepts a zip file via multipart form upload.
- Maximum file size: 1 GB.
- The filename from the upload is used as the backup key.

**Test evidence:** `backup.test.ts` → "upload accepts a zip file"
