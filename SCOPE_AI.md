# Solarch AI Development Scope

## Overview
Integrate AI capabilities directly into Solarch to accelerate development workflows: generate schemas from descriptions, write access rules in plain English, seed realistic data, and provide an AI admin assistant.

## Proposed Features

### 1. AI Schema Generator (High Priority)
**Endpoint:** `POST /api/ai/generate-collection`

Convert natural language descriptions into full Collection schemas.

**Input:**
```json
{
  "description": "A blog post with title, content, published date, tags, and an author relation to users. Posts can be drafts or published."
}
```

**Output:**
```json
{
  "name": "posts",
  "type": "base",
  "fields": [
    { "name": "title", "type": "text", "required": true },
    { "name": "content", "type": "editor", "required": true },
    { "name": "published", "type": "bool", "required": false },
    { "name": "tags", "type": "select", "maxSelect": 10, "values": [] },
    { "name": "author", "type": "relation", "collectionId": "...", "maxSelect": 1 }
  ],
  "listRule": "published = true || @request.auth.id != \"\"",
  "createRule": "@request.auth.id != \"\"",
  "updateRule": "author = @request.auth.id",
  "deleteRule": "author = @request.auth.id"
}
```

### 2. AI Access Rule Translator
**Endpoint:** `POST /api/ai/generate-rule`

Convert plain English security requirements into Solarch filter expressions.

**Input:**
```json
{
  "action": "update",
  "description": "Only the record owner or admins can update. Owner field is called 'user'."
}
```

**Output:**
```json
{
  "rule": "user = @request.auth.id || @request.auth.isAdmin = true"
}
```

### 3. AI Data Seeder
**Endpoint:** `POST /api/ai/seed`

Generate realistic seed data for any collection using an LLM.

**Input:**
```json
{
  "collectionName": "products",
  "count": 10,
  "locale": "en",
  "constraints": "Tech gadgets, prices between $10-$500"
}
```

### 4. AI Admin Assistant
**Route:** `GET /_/#/ai`

A browser-based chat interface where developers can:
- Ask "What collections do I have?"
- Say "Create a todo app with users, projects, and tasks"
- Request "Show me all records in the posts collection where published is false"
- Get help with filter syntax

### 5. Vector Search / Semantic RAG Support
**Field Type:** `vector` (new)

Store embedding vectors alongside records and perform cosine similarity search.

**Use Cases:**
- Semantic document search
- Similar product recommendations
- Content-based filtering

**Endpoint:** `POST /api/collections/{name}/vector-search`

## Implementation Plan

### Phase 1: Core AI Infrastructure
- [ ] Create `src/ai/` module
- [ ] Abstract LLM provider interface (OpenAI, Anthropic, Ollama, local)
- [ ] Add `AIConfig` to AppSettings (provider, apiKey, model, baseURL)
- [ ] Build prompt templates for schema/rule/data generation

### Phase 2: Schema & Rule Generation
- [ ] Implement `POST /api/ai/generate-collection`
- [ ] Implement `POST /api/ai/generate-rule`
- [ ] Add validation layer (generated schemas must be valid)
- [ ] Add "dry run" option to preview before applying

### Phase 3: Data Seeding & Admin Assistant
- [ ] Implement `POST /api/ai/seed`
- [ ] Build `/_/#/ai` chat UI (simple HTML/JS)
- [ ] Integrate with existing collection/record APIs
- [ ] Support streaming responses (SSE)

### Phase 4: Vector Search
- [ ] Add `vector` field type
- [ ] Implement cosine similarity SQL function for SQLite
- [ ] Add embedding generation hook
- [ ] Build vector search endpoint

## Configuration

Add to `AppSettings`:
```typescript
interface AIConfig {
  enabled: boolean
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom'
  apiKey: string
  model: string
  baseURL: string  // for custom/ollama
  maxTokens: number
  temperature: number
}
```

## Security Considerations
- AI endpoints require superuser auth
- API keys stored encrypted in settings
- Prompt injection mitigation (validate generated JSON before applying)
- Rate limiting on AI endpoints
