---
title: "JavaScript Hooks"
description: "Extend backend behavior using JavaScript hooks in pb_hooks and isolated sandboxes."
slug: "features/js-hooks"
---

# JavaScript Hooks

Solarch allows developers to extend backend execution logic using custom JavaScript files placed in `pb_hooks/*.js` ([src/tools/jsvm/jsvm.ts](../../src/tools/jsvm/jsvm.ts)). Use hooks to validate incoming requests, send third-party webhook alerts, or mutate records before database writes.

---

## 1. Writing Your First Hook

Create a JavaScript file inside the `pb_hooks` directory in your project root:

```javascript
// pb_hooks/posts_automation.js

onRecordBeforeCreateRequest((e) => {
  console.log('Intercepted post creation:', e.record.get('title'))
  
  // Set default field value
  if (!e.record.get('status')) {
    e.record.set('status', 'draft')
  }
}, 'posts')

onRecordAfterCreateSuccess((e) => {
  console.log('Successfully created post with ID:', e.record.id)
}, 'posts')
```

---

## 2. Global JSVM Globals & Context

Inside `pb_hooks/*.js`, the following globals are available:
- `$app`: Reference to the `BaseApp` instance ([src/core/base.ts](../../src/core/base.ts)).
- `onRecordBeforeCreateRequest(handler, collectionName)`: Intercept record creation requests.
- `onRecordAfterCreateSuccess(handler, collectionName)`: Post-create hook.
- `onRecordBeforeUpdateRequest(handler, collectionName)`: Intercept record update requests.
- `onRecordAfterUpdateSuccess(handler, collectionName)`: Post-update hook.
- `onRecordBeforeDeleteRequest(handler, collectionName)`: Intercept record deletion requests.
- `onRecordAfterDeleteSuccess(handler, collectionName)`: Post-delete hook.
- `console`: Standard logging utility.
- `require()`: Load allowed Node modules.

---

## 3. Isolated Deno Execution Sandbox ([src/tools/jsvm/deno_sandbox.ts](../../src/tools/jsvm/deno_sandbox.ts))

For multi-tenant environments or untrusted user code execution, Solarch supports an isolated Deno sandbox mode.

### Enable Deno Isolation Mode

Set environment variables before starting Solarch:

```bash
export JSVM_SANDBOX_MODE=isolated
export JSVM_MAX_CONCURRENT=8
export JSVM_MAX_MEMORY_MB=64

solarch serve --port 8090
```

### Verification Log Output
When `JSVM_SANDBOX_MODE=isolated` is enabled and Deno is detected, Solarch outputs:
```text
[JSVM] Isolated sandbox mode active for agent nodes (Deno 1.40.0)
[JSVM] Hooks always run in legacy mode (operator-trusted files)
```

---

## Common Errors

### Error: `JSVM_SANDBOX_MODE=isolated but Deno is not available.`
- **Cause**: Environment variable set to `isolated`, but `deno` binary is not found in system `PATH` ([src/tools/jsvm/jsvm.ts:L46](../../src/tools/jsvm/jsvm.ts#L46)).
- **Fix**: Install Deno (`curl -fsSL https://deno.land/install.sh | sh`) or un-set `JSVM_SANDBOX_MODE`.

### Error: `Failed to load hook file.`
- **Cause**: Syntax error or missing module inside a `pb_hooks/*.js` script ([src/tools/jsvm/jsvm.ts:L65](../../src/tools/jsvm/jsvm.ts#L65)).
- **Fix**: Check terminal logs for file line numbers and syntax error tracebacks.
