# Phase 5E — AI Assistant Implementation Plan

## Overview
This plan addresses the critical shortcomings of the current AI Assistant implementation identified during the Phase 5E audit. The primary objectives are to repair the broken conversational memory, enforce strict input boundaries, and elevate the UX to the Phase 4C visual standard.

---

## 1. BACKEND REQUIRED: Conversation History Repair
Currently, the backend only accepts a single string `{ message }` and treats every turn as a new conversation.

*   **API Change (`POST /api/ai/chat`)**: 
    *   **Old**: `{ message: string }`
    *   **New**: `{ messages: { role: 'user' | 'assistant', content: string }[] }`
*   **Exact Files**: 
    *   `src/apis/ai.ts`
    *   `src/ai/service.ts`
*   **API Contract Audit**:
    *   A repository search confirms the only callers are `admin/src/pages/AIAssistant.tsx` and backend test suites (if any exist for `/api/ai/chat`).
    *   Every caller and test must be updated to the new `messages` array shape.

## 2. SECURITY FIX: Strict Message Validation & Input Bounds
The backend currently accepts unbounded strings. Moving to an array opens potential DoS vectors. We will enforce multiple strict limits.

*   **Total Payload Limits**:
    *   **Max 50 messages**.
    *   **Max 10,000 characters per message**.
    *   **Max 64,000 characters total conversation** (`MAX_TOTAL_CHARS`). 
    *   *Justification*: The `gpt-4o-mini` default model has a 128k token context window, but the default `maxTokens` config limits completion to 4096 tokens. Limiting the incoming payload to 64,000 characters (~16,000 tokens) provides abundant multi-turn context while preventing massive string parsing overhead, leaving ample room for the system prompt.
*   **Message Validation Contract**:
    *   `messages` must be a non-empty array.
    *   `role` must be exactly `"user"` or `"assistant"`.
    *   `content` must be a non-empty string after trimming.
    *   `content` must not exceed the individual character limit.
    *   Total `content` across all messages must not exceed the aggregate limit.
    *   The **final message** submitted for generation must be a `"user"` message.
    *   Return `400 Bad Request` for any violation.
*   **System Prompt Invariant**:
    *   The backend must unconditionally construct: `[{ role: "system", content: generatedSystemPrompt }, ...validatedClientMessages]`.
    *   The client must never be able to supply or override a `system` message.
*   **Client-Controlled History**:
    *   Conversation history originates from client-side `localStorage` and is strictly **untrusted**.
    *   Assistant messages are contextual input only. The system must **never** derive authorization, privileges, tool permissions, system instructions, or database permissions from assistant-message contents. This is acceptable for Phase 5E because the AI has no autonomous tool/function execution.

## 3. FRONTEND ONLY: React Query & Architecture
*   **Exact Files**: 
    *   `admin/src/hooks/useAI.ts` (NEW)
    *   `admin/src/pages/AIAssistant.tsx`
*   **Implementation**:
    *   Create a `useChatMutation` hook in `useAI.ts` that wraps `api.post('/api/ai/chat', { messages })`.
    *   **Frontend History Window**: Before calling the backend, select only the latest backend-allowed messages (e.g. slicing the last 50). Do not blindly send all 100 stored messages. Ensure the final message sent is the newly submitted user message.
    *   **Error Handling**: Do not inject fake assistant messages such as `"Error: Internal server error"`. The conversation history must remain uncontaminated by transport errors. Handle `.error` states gracefully using the existing `Toast`/`ErrorState` architecture.

## 4. UX IMPROVEMENT: Phase 4C Polish & Textarea
*   **Exact Files**: 
    *   `admin/src/pages/AIAssistant.tsx`
    *   `package.json` (admin)
*   **Implementation**:
    *   **Layout**: Wrap the main chat interface in the standard Phase 4C `<Panel>` component.
    *   **Composer Behavior**: 
        *   Replace `<input>` with an auto-expanding `<textarea>`.
        *   `Enter` -> submit.
        *   `Shift+Enter` -> newline.
        *   Prevent empty message submission.
        *   Disable submission while pending (prevent duplicates).
        *   Ensure IME composition (e.g. CJK character input) does not accidentally submit on `Enter`.
        *   Textarea must remain keyboard accessible.
    *   **Markdown Security**:
        *   Install `react-markdown` + `remark-gfm` to render model output.
        *   Treat all model output as **untrusted display content**.
        *   Do NOT enable arbitrary raw HTML (no `rehypeRaw`).
        *   Do NOT use `dangerouslySetInnerHTML`.
        *   Verify safe link handling and inert code-block rendering.
    *   **Dialogs**: Replace the native `window.confirm()` for "Clear All" with the custom `Dialog` primitive.

## 5. FUTURE FEATURES (DO NOT CHANGE)
The following items remain strictly as future roadmap items and must **not** be implemented in Phase 5E:
*   Streaming responses.
*   RAG (Retrieval-Augmented Generation) against live records.
*   Cmd+K / Spotlight.
*   AI tools / autonomous actions.
*   Database mutation through chat.
*   Conversation persistence on the backend.

---

## Testing Strategy
1.  **Backend Tests (`ai.test.ts`)**: Expand tests to cover the following explicit requirements:
    *   Empty messages array.
    *   Empty content.
    *   Whitespace-only content.
    *   Invalid role (e.g., `'system'`).
    *   System role injection attempt.
    *   >50 messages.
    *   Oversized individual message.
    *   Oversized total conversation payload.
    *   Valid multi-turn conversation.
    *   Final assistant message rejection (final must be user).
    *   Verify the system prompt always appears first in the final payload to `AIService`.
    *   Verify previous user + assistant messages successfully reach `AIService`.
2.  **Visual QA**:
    *   Verify chat auto-scrolls to the bottom on new messages.
    *   Verify Markdown code blocks render cleanly and inertly.
    *   Verify composer IME, `Enter`, and `Shift+Enter` behavior.

## Definition of Done
Phase 5E will be complete when the backend safely ingests and bounds a full conversation array with exact validation, the frontend renders it beautifully using Phase 4C primitives and secure Markdown, the Composer UX behaves flawlessly, and all security limits (lengths, roles, final message) are strictly enforced in the Express route.
