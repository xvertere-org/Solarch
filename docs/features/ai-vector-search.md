---
title: "AI & Vector Search"
description: "Generate collections, access rules, seed data, and execute vector similarity searches."
slug: "features/ai-vector-search"
---

# AI & Vector Search

Solarch includes integrated Large Language Model (LLM) tools and SQLite vector similarity search ([src/ai/service.ts](../../src/ai/service.ts), [src/core/record_query.ts:L220](../../src/core/record_query.ts#L220)). Use it to automate schema generation, generate security rules, seed mock records, and run semantic vector searches over embeddings.

---

## 1. AI Configuration ([src/ai/provider.ts:L26](../../src/ai/provider.ts#L26))

AI services support `openai`, `anthropic`, `ollama`, or `custom` providers. Configure AI settings in `solarch.config.ts` or via the Admin UI.

```typescript
// solarch.config.ts
export default {
  ai: {
    enabled: true,
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.2,
  }
}
```

---

## 2. AI Collection Generator ([src/apis/ai.ts:L14](../../src/apis/ai.ts#L14))

Generate a complete collection schema from a natural language description.

```bash
curl -X POST http://localhost:8090/api/ai/generate-collection \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "An e-commerce products collection with title, price, stock, and categories",
    "dryRun": false
  }'
```

---

## 3. AI Security Rule Generator ([src/apis/ai.ts:L29](../../src/apis/ai.ts#L29))

Generate security rule strings for collections using natural language prompts.

```bash
curl -X POST http://localhost:8090/api/ai/generate-rule \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "description": "Only allow updating if the user is the owner of the record and the record is not locked"
  }'
```

---

## 4. Record Seeding ([src/apis/ai.ts:L44](../../src/apis/ai.ts#L44))

Automatically seed mock test data into any collection.

```bash
curl -X POST http://localhost:8090/api/ai/seed \
  -H "Authorization: Bearer SUPERUSER_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "products",
    "count": 5
  }'
```

---

## 5. Vector Similarity Search ([src/apis/record_crud.ts:L75](../../src/apis/record_crud.ts#L75))

Perform vector similarity queries over float array fields (`vector` field type).

```bash
curl -X POST http://localhost:8090/api/collections/documents/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "field": "embedding",
    "vector": [0.12, -0.43, 0.88, 0.05],
    "limit": 5,
    "minSimilarity": 0.7
  }'
```

### Expected Output
```json
[
  {
    "id": "doc123456789abc",
    "title": "Machine Learning Guide",
    "embedding": [0.11, -0.42, 0.85, 0.04],
    "similarity": 0.94
  }
]
```

---

## Common Errors

### Error: `Description is required.`
- **Cause**: Called `/api/ai/generate-collection` without passing `description` in body ([src/apis/ai.ts:L18](../../src/apis/ai.ts#L18)).
- **Fix**: Supply a descriptive prompt string explaining the desired schema.

### Error: `Missing required fields: field, vector`
- **Cause**: Vector search payload missing `field` or `vector` array ([src/apis/record_crud.ts:L84](../../src/apis/record_crud.ts#L84)).
- **Fix**: Ensure payload contains `field` matching a vector column name and `vector` containing a valid float array.
