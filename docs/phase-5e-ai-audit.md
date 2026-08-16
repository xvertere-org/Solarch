# Phase 5E — AI Assistant Audit

## 1. Executive Summary
The Solarch AI Assistant currently operates as a stateless, isolated conversational interface. While it possesses strong backend security bounds—preventing autonomous destructive actions—its conversational model is fundamentally broken: the frontend never sends chat history to the backend, rendering the AI completely amnesic. The UI lacks Phase 4C polish, uses a single-line input preventing complex prompts, and does not render markdown.

## 2. Complete Frontend → Backend Flow
1. **Frontend**: User types in `<input>` in `AIAssistant.tsx` and submits.
2. **State**: Message is appended to `localStorage` session.
3. **API**: `POST /api/ai/chat` is called with `{ message: "text" }`. *Crucially, history is not sent.*
4. **Backend Route**: `src/apis/ai.ts` receives `{ message }` and passes it to `AIService.chat(message)`.
5. **Prompt Construction**: `src/ai/service.ts` queries all DB collections, formats their names and fields into a hardcoded System Prompt, and constructs a 2-message array: `[{ role: 'system', content: ... }, { role: 'user', content: message }]`.
6. **Provider**: `LLMProvider.complete()` executes the request synchronously.
7. **Response**: Backend extracts the text and returns `{ reply }` to the frontend.
8. **Render**: Frontend appends the reply to local state and displays it.

## 3. Conversation Architecture
- **Structure**: `{ role: 'user' | 'assistant', content: string }`.
- **Persistence**: Exclusively client-side in `localStorage`. The backend has zero persistence.
- **Context Window**: **BROKEN.** Because the frontend only sends `{ message: string }`, the backend never receives previous conversation turns. Every single chat message is treated as the very first message of a new conversation.
- **Limits**: The frontend arbitrarily slices local history via `.slice(-100)`, but this is irrelevant to the backend since it only receives one message. 

## 4. Provider Architecture
- **Supported Providers**: `openai`, `anthropic`, `ollama`, `openrouter`, `custom`.
- **Abstraction**: Handled cleanly in `src/ai/provider.ts` via an `LLMProvider` interface.
- **Capabilities**: The interface defines `.complete()` and an optional `.stream()` async generator. Only `OpenAIProvider` implements `.stream()`.

## 5. API Key Security
- **Storage**: AI keys reside exclusively on the server in Settings.
- **Leakage**: Provider instantiation occurs entirely server-side. The `/api/ai/chat` endpoint wraps errors in a generic 500 `Internal server error`, safely avoiding key leakage. The `/api/ai/test` endpoint does return `err.message`, which could leak provider error details to Superusers, but this is an authenticated admin route.

## 6. Prompt Security
- **System Prompts**: Hardcoded server-side inside `AIService`.
- **Client Influence**: The client cannot override system prompts. They can only supply the `user` message.
- **Role Validation**: Roles do not need validation currently because the backend hardcodes `role: 'user'` for the incoming payload.

## 7. Input Validation
- **Frontend**: Checks `!input.trim()`.
- **Backend**: Verifies `!message` exists. 
- **Missing**: No length bounds on the incoming message string, creating a potential vector for DoS via massive payloads.

## 8. Error Handling
- **Provider Errors**: Caught by `try/catch`, logged to the server console, and mapped to a 500 error.
- **UX**: The frontend injects the error directly into the chat stream (`content: 'Error: Internal server error'`). It does not utilize standard `Toast` or `ErrorState` primitives.

## 9. Chat UX Audit
- **Layout**: Uses a basic flexbox column that does not align with Phase 4C (e.g., lacks `Panel` wrappers, uses non-standard borders).
- **Input**: Uses a standard text `<input>` instead of a `<textarea>`, making it impossible to paste multi-line code snippets or write complex prompts.
- **Rendering**: Uses `whitespace-pre-wrap` instead of a Markdown renderer, so AI code blocks and bold text render as raw syntax.
- **Actions**: "Clear All" uses a browser `window.confirm()` instead of the Phase 4C `Dialog`.

## 10. Streaming Capability
- **Backend**: The `LLMProvider` interface supports streaming via `stream()`, and `OpenAIProvider` implements it.
- **Usage**: `AIService` and `ai.ts` **do not use streaming**. They exclusively use `.complete()`.
- **Recommendation**: Do not implement streaming in Phase 5E. It requires significant rewrites to Express routes (SSE) and frontend state management.

## 11. Database Context
- **Context Provided**: Every `/chat` request dynamically fetches `app.findAllCollections()` and injects the collection names, types, and field names into the System Prompt.
- **Missing Context**: Records, logs, rules, and settings are NOT provided to the AI. 

## 12. Destructive Operations
- **Autonomy**: The AI has zero autonomy. It does not possess function calling or tool access to execute SQL or modify the database from the `/chat` interface.
- **API Actions**: Specific endpoints (`/generate-collection`, `/seed`) explicitly perform database writes (`app.save()`), but these are discrete, superuser-authenticated REST endpoints, not autonomous agentic loops.

## 13. React Query Assessment
- **Chat State**: Must remain strictly Local State. Conversational flow is highly mutable and ephemeral; forcing it into React Query cache would be an anti-pattern.
- **Queries**: `generate-collection` and `seed` could be modeled as mutations, but they are not the primary focus of the Chat UX.

## 14. Performance
- **Prompt Overhead**: Because the backend fetches all collections from SQLite on every single chat message, performance could degrade slightly on very large databases, but SQLite easily handles this locally.

## 15. Observability
- **Logs**: Provider errors are logged via `app.logger()`. Keys are not logged.

## 16. Long-Term AI Architecture
- **Evolution**: The AI should eventually evolve into a context-aware Cmd+K command palette, utilizing actual RAG (Retrieval-Augmented Generation) against schema documentation, and capable of generating read-only queries (View Collections) dynamically.
