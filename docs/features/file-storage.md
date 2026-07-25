---
title: "File Storage"
description: "Upload, manage, thumbnail, and protect file assets."
slug: "features/file-storage"
---

# File Storage

Solarch provides built-in file attachment storage for collection records with support for image thumbnail generation and tokenized file protection ([src/apis/file.ts](../../src/apis/file.ts)). Use it to manage user avatars, documents, and media uploads.

---

## 1. Uploading Files

Files are uploaded using standard `multipart/form-data` requests to record creation or update endpoints.

```bash
curl -X POST http://localhost:8090/api/collections/posts/records \
  -H "Authorization: Bearer USER_AUTH_TOKEN" \
  -F "title=Post with Image" \
  -F "cover_image=@/path/to/local/image.png"
```

### Expected Output
```json
{
  "id": "rec987654321xyz",
  "title": "Post with Image",
  "cover_image": "image_a1b2c3d4.png"
}
```

---

## 2. Retrieving Files ([src/apis/file.ts:L45](../../src/apis/file.ts#L45))

Uploaded files are served via `GET /api/files/:collection/:recordId/:filename`.

### Direct File Download
```bash
curl -X GET http://localhost:8090/api/files/posts/rec987654321xyz/image_a1b2c3d4.png --output image.png
```

### Image Thumbnails
Generate on-the-fly resized image thumbnails using the `thumb` query parameter ([src/apis/file.ts:L90](../../src/apis/file.ts#L90)). Supported formats: `WIDTHxHEIGHT` (e.g. `100x100`, `300x0`, `0x200`).

```bash
curl -X GET "http://localhost:8090/api/files/posts/rec987654321xyz/image_a1b2c3d4.png?thumb=100x100" --output thumb.png
```

---

## 3. Protected File Tokens ([src/apis/file.ts:L160](../../src/apis/file.ts#L160))

For collections with protected file access rules, clients must request a short-lived file token before accessing file URLs.

### Step 1: Request File Access Token
```bash
curl -X POST http://localhost:8090/api/files/token \
  -H "Authorization: Bearer USER_AUTH_TOKEN"
```

#### Output
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 2: Fetch Protected File with Token
```bash
curl -X GET "http://localhost:8090/api/files/protected_docs/rec123/doc.pdf?token=FILE_TOKEN"
```

---

## Common Errors

### Error: `File size exceeds limit.`
- **Cause**: Uploaded file size exceeds max allowed size for the field schema or global body limit (10MB) ([src/apis/middlewares_body_limit.ts:L5](../../src/apis/middlewares_body_limit.ts#L5)).
- **Fix**: Compress the file or increase `bodyLimit` settings in server initialization.

### Error: `Invalid file token.`
- **Cause**: The `token` parameter passed to `/api/files/...` is missing, invalid, or expired ([src/apis/file.ts:L175](../../src/apis/file.ts#L175)).
- **Fix**: Re-issue a file token via `POST /api/files/token` before fetching the file.
