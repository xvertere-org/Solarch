---
title: "Database & Collections"
description: "Manage database collections, fields, CRUD operations, filtering, sorting, and batch requests."
slug: "features/database-collections"
---

# Database & Collections

Solarch provides a full-featured schema builder and query engine powered by SQLite and SQL safety layers ([src/utils/sql_safe.ts](../../src/utils/sql_safe.ts)). Use it to define application data schema and run CRUD queries over REST or TypeScript APIs.

---

## Field Types ([src/core/field.ts](../../src/core/field.ts))

Supported collection field types:
- `text`: String value.
- `number`: Numeric value (integer or float).
- `bool`: Boolean (`true` / `false`).
- `email`: Email address string with regex validation.
- `url`: Web URL string.
- `datetime`: ISO-8601 date string.
- `select`: Predefined string option list.
- `file`: File attachment upload reference.
- `relation`: Foreign key relation to another collection.
- `json`: JSON object or array.
- `vector`: Floating point number array for vector embeddings.

---

## Collection CRUD Operations

### Create a Collection ([src/apis/collection.ts:L65](../../src/apis/collection.ts#L65))

```bash
curl -X POST http://localhost:8090/api/collections \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "posts",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "id = @request.auth.id",
    "updateRule": "id = @request.auth.id",
    "deleteRule": null,
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "content", "type": "text" },
      { "name": "published", "type": "bool" }
    ]
  }'
```

---

## Record CRUD Operations

### List Records ([src/apis/record_crud.ts:L14](../../src/apis/record_crud.ts#L14))

```bash
curl -X GET "http://localhost:8090/api/collections/posts/records?page=1&perPage=20&filter=published=true&sort=-created"
```

#### Query Parameters
- `page` (number, default: `1`): Page number.
- `perPage` (number, default: `30`, max: `500`): Items per page ([src/utils/pagination.ts:L8](../../src/utils/pagination.ts#L8)).
- `filter` (string): Search expression (e.g. `title ~ "announcement"`).
- `sort` (string): Sorting order. Prefix `-` for descending (e.g. `-created,title`).
- `expand` (string): Comma-separated list of relation fields to expand.
- `fields` (string): Comma-separated list of record properties to return.

#### Expected Output
```json
{
  "page": 1,
  "perPage": 20,
  "totalItems": 1,
  "totalPages": 1,
  "items": [
    {
      "id": "rec123456789abc",
      "collectionId": "posts_coll_id",
      "collectionName": "posts",
      "title": "Welcome to Solarch",
      "content": "First post content...",
      "published": true,
      "created": "2026-07-25 10:00:00.000Z",
      "updated": "2026-07-25 10:00:00.000Z"
    }
  ]
}
```

---

### Create a Record ([src/apis/record_crud.ts:L180](../../src/apis/record_crud.ts#L180))

```bash
curl -X POST http://localhost:8090/api/collections/posts/records \
  -H "Authorization: Bearer USER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with Solarch",
    "content": "Solarch is fast and simple.",
    "published": true
  }'
```

---

### Batch Requests ([src/apis/batch.ts:L30](../../src/apis/batch.ts#L30))

Execute multiple transactional requests in a single HTTP request.

```bash
curl -X POST http://localhost:8090/api/batch \
  -H "Authorization: Bearer USER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "method": "POST",
        "url": "/api/collections/posts/records",
        "body": { "title": "Batch Post 1" }
      },
      {
        "method": "POST",
        "url": "/api/collections/posts/records",
        "body": { "title": "Batch Post 2" }
      }
    ]
  }'
```

---

## Common Errors

### Error: `Failed to create record.`
- **Cause**: Record failed field schema validation (e.g. required field missing or wrong field type) ([src/core/record_upsert.ts:L85](../../src/core/record_upsert.ts#L85)).
- **Fix**: Check `data.errors` in the response JSON to identify failing fields.

### Error: `Invalid column name in sort expression.`
- **Cause**: Attempted to sort by a field not present on the collection schema ([src/core/record_query.ts:L120](../../src/core/record_query.ts#L120)).
- **Fix**: Verify field names in the collection definition before querying.
