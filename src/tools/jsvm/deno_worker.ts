const MAX_LOG_ENTRIES = 500;

const MAX_LOG_LINE_BYTES = 4096;


const RESERVED_GLOBALS = new Set([
  'console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number',
  'Boolean', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'ReferenceError', 'URIError', 'EvalError', 'Promise', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'parseInt', 'parseFloat', 'isNaN',
  'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent',
  'decodeURIComponent', 'Intl', 'URL', 'URLSearchParams', 'ArrayBuffer',
  'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array',
  'Int32Array', 'Float32Array', 'Float64Array', 'DataView', 'TextEncoder',
  'TextDecoder', 'structuredClone', 'queueMicrotask', 'atob', 'btoa',
  'Deno', 'process', 'require', 'globalThis', 'self', 'window', 'global',
  'eval', 'Function', 'import', '__dirname', '__filename', 'arguments',
  'Reflect', 'Proxy', 'constructor',
]);


const collectedLogs: string[] = [];

function safeStringify(args: unknown[]): string {
  return args
    .map((a) => {
      try {
        return typeof a === 'string' ? a : JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function pushLog(line: string): void {
  if (collectedLogs.length >= MAX_LOG_ENTRIES) return;
  collectedLogs.push(line.length > MAX_LOG_LINE_BYTES ? line.slice(0, MAX_LOG_LINE_BYTES) + '...[truncated]' : line);
}

const sandboxConsole = {
  log: (...args: unknown[]) => pushLog(safeStringify(args)),
  info: (...args: unknown[]) => pushLog(`[INFO] ${safeStringify(args)}`),
  warn: (...args: unknown[]) => pushLog(`[WARN] ${safeStringify(args)}`),
  error: (...args: unknown[]) => pushLog(`[ERROR] ${safeStringify(args)}`),
  debug: (...args: unknown[]) => pushLog(`[DEBUG] ${safeStringify(args)}`),
};

interface SandboxPayload {
  code: string;
  context: Record<string, unknown>;
  mode: 'hook' | 'code' | 'condition';
}

interface SandboxResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  logs: string[];
}

function writeResult(response: SandboxResponse): void {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(response) + '\n');
  Deno.stdout.writeSync(data);
}

async function readStdin(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(4096);
  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break; // EOF
    chunks.push(buf.slice(0, n));
  }
  return decoder.decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array(0))
  );
}

function sanitizeContextKeys(context: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(context)) {
    if (RESERVED_GLOBALS.has(key)) {
      // Silently drop — log it for debugging but don't let it through
      collectedLogs.push(`[SECURITY] Dropped reserved context key: "${key}"`);
      continue;
    }
    safe[key] = context[key];
  }
  return safe;
}

function buildSandboxGlobals(context: Record<string, unknown>): Record<string, unknown> {

  const sanitizedContext = sanitizeContextKeys(context);

  return {
    ...sanitizedContext,
    console: sandboxConsole,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    URIError,
    EvalError,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    decodeURI,
    encodeURIComponent,
    decodeURIComponent,
    Intl,
    URL,
    URLSearchParams,
    ArrayBuffer,
    Uint8Array,
    Int8Array,
    Uint16Array,
    Int16Array,
    Uint32Array,
    Int32Array,
    Float32Array,
    Float64Array,
    DataView,
    TextEncoder,
    TextDecoder,
    structuredClone,
    queueMicrotask,
    atob,
    btoa,
    Deno: undefined,
    process: undefined,
    require: undefined,
    globalThis: undefined,
    self: undefined,
    window: undefined,
    global: undefined,
    eval: undefined,
    Function: undefined,
    import: undefined,
    __dirname: undefined,
    __filename: undefined,
    arguments: undefined,
    Reflect: undefined,
    Proxy: undefined,
    constructor: undefined,
  };
}
function executeCode(code: string, globals: Record<string, unknown>, mode: string): unknown {
  const paramNames = Object.keys(globals);
  const paramValues = Object.values(globals);
  let wrappedCode: string;
  if (mode === 'condition') {
    wrappedCode = `"use strict";\nreturn Boolean(${code});`;
  } else {
    wrappedCode = `"use strict";\n${code}`;
  }
  const fn = new Function(...paramNames, wrappedCode);
  return fn(...paramValues);
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      writeResult({ success: false, error: 'Empty input', logs: collectedLogs });
      Deno.exit(1);
    }

    let payload: SandboxPayload;
    try {
      payload = JSON.parse(raw.trim());
    } catch {
      writeResult({ success: false, error: 'Invalid JSON input', logs: collectedLogs });
      Deno.exit(1);
    }

    if (!payload.code || typeof payload.code !== 'string') {
      writeResult({ success: false, error: 'Missing or invalid "code" field', logs: collectedLogs });
      Deno.exit(1);
    }

    const globals = buildSandboxGlobals(payload.context || {});
    const result = executeCode(payload.code, globals, payload.mode || 'code');
    const resolvedResult = result instanceof Promise ? await result : result;

    let serializableResult: unknown;
    try {
      serializableResult = JSON.parse(JSON.stringify(resolvedResult));
    } catch {
      serializableResult = String(resolvedResult);
    }

    writeResult({ success: true, result: serializableResult, logs: collectedLogs });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    writeResult({ success: false, error: errorMessage, logs: collectedLogs });
    Deno.exit(1);
  }
}

main();
