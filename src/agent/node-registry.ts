import { NodeDefinition, NodeExecutionResult, ExecutionContext } from './types'
import vm from 'vm'
import { runInDeno } from '../tools/jsvm/deno_sandbox'
import { getSandboxMode } from '../tools/jsvm/jsvm'

const registry = new Map<string, NodeDefinition>()

export function registerNode(def: NodeDefinition): void {
  if (registry.has(def.type)) {
    throw new Error(`Node type "${def.type}" is already registered`)
  }
  registry.set(def.type, def)
}

export function getNode(type: string): NodeDefinition | undefined {
  return registry.get(type)
}

export function listNodes(): NodeDefinition[] {
  return Array.from(registry.values())
}

export function listNodesByCategory(category: string): NodeDefinition[] {
  return Array.from(registry.values()).filter(n => n.category === category)
}

function makeResult(nodeId: string, nodeType: string, output: any, status: 'success' | 'error' = 'success', error?: string): NodeExecutionResult {
  const start = new Date()
  const end = new Date()
  return { nodeId, nodeType, status, output, error, startTime: start.toISOString(), endTime: end.toISOString(), duration: end.getTime() - start.getTime() }
}


async function executeSandboxed(code: string, input: any, ctx: ExecutionContext, timeoutMs = 5000): Promise<any> {
  if (getSandboxMode() === 'isolated') {
    return executeSandboxedIsolated(code, input, ctx, timeoutMs)
  }

  return executeSandboxedLegacy(code, input, ctx, timeoutMs)
}

async function executeSandboxedIsolated(code: string, input: any, ctx: ExecutionContext, timeoutMs: number): Promise<any> {
  const maxMemoryMb = parseInt(process.env.JSVM_MAX_MEMORY_MB || '64', 10)

  const result = await runInDeno(
    code,
    { input, executionId: ctx.executionId },
    { timeoutMs, maxMemoryMb, mode: 'code' }
  )
  if (result.logs?.length && ctx.logger) {
    for (const log of result.logs) {
      ctx.logger(log)
    }
  }

  if (!result.success) {
    throw new Error(result.error || 'Code execution failed in isolated sandbox')
  }

  return result.result
}
const LEGACY_BLOCKED_PATTERNS: RegExp[] = [
  /\bprocess\b/,
  /\brequire\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bglobal\b/,
  /\bglobalThis\b/,
  /\bimport\s*\(/,
  /\beval\s*\(/,
  /\bconstructor\b/,
  /\bprototype\b/,
  /\b__proto__\b/,
  /\bFunction\b/,
  /\bReflect\b/,
  /\bProxy\b/,
  /\bDeno\b/,
  /\bchild_process\b/,
  /\bexecSync\b/,
  /\bspawnSync\b/,
  /\bexecFileSync\b/,
  /\[\s*['"`]constructor['"`]\s*\]/,
  /\[\s*['"`]__proto__['"`]\s*\]/,
  /\[\s*['"`]prototype['"`]\s*\]/,
  /['"`]con['"`]\s*\+\s*['"`]structor['"`]/,
  /['"`]proto['"`]\s*\+\s*['"`]type['"`]/,
  /['"`]proc['"`]\s*\+\s*['"`]ess['"`]/,
  /['"`]req['"`]\s*\+\s*['"`]uire['"`]/,
  /\\u0070rocess/,
  /\\u0072equire/,
  /\\u0065val/,
]

function validateLegacyCode(code: string): void {
  for (const pattern of LEGACY_BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error(
        'Code contains blocked identifiers. Disallowed: process, require, import, eval, ' +
        'constructor, prototype, __proto__, Function, Reflect, Proxy, Deno, globalThis, global, ' +
        '__dirname, __filename, child_process'
      )
    }
  }
}

async function executeSandboxedLegacy(code: string, input: any, ctx: ExecutionContext, timeoutMs: number): Promise<any> {
  validateLegacyCode(code)

  const sandbox: Record<string, any> = {
    input,
    ctx: { executionId: ctx.executionId, logger: ctx.logger, abortSignal: ctx.abortSignal },
    console: ctx.logger ? { log: ctx.logger, info: ctx.logger, warn: ctx.logger, error: ctx.logger, debug: ctx.logger } : console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Map, Set, Promise, Error, parseInt, parseFloat, isNaN, isFinite,
    process: undefined,
    require: undefined,
    global: undefined,
    globalThis: undefined,
    Reflect: undefined,
    Proxy: undefined,
    Function: undefined,
    Deno: undefined,
    __dirname: undefined,
    __filename: undefined,
  }

  const script = new vm.Script(`"use strict"; (function() { ${code} })()`)
  const context = vm.createContext(sandbox)
  const result = await Promise.race([
    script.runInContext(context, { timeout: timeoutMs, breakOnSigint: true }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Code execution timed out')), timeoutMs)),
  ])
  return result
}

registerNode({
  type: 'trigger_webhook',
  label: 'Webhook',
  description: 'Start workflow via HTTP webhook',
  category: 'trigger',
  execute: async (config, input, ctx) => {
    return makeResult(ctx.executionId, 'trigger_webhook', input || {})
  },
})

registerNode({
  type: 'trigger_cron',
  label: 'Schedule',
  description: 'Start workflow on a cron schedule',
  category: 'trigger',
  execute: async (config, input, ctx) => {
    return makeResult(ctx.executionId, 'trigger_cron', { triggeredAt: new Date().toISOString(), schedule: config.schedule })
  },
})

registerNode({
  type: 'trigger_event',
  label: 'Event',
  description: 'Start workflow on a TspoonBase event (record create, update, delete)',
  category: 'trigger',
  execute: async (config, input, ctx) => {
    return makeResult(ctx.executionId, 'trigger_event', input || {})
  },
})

registerNode({
  type: 'llm',
  label: 'LLM Call',
  description: 'Call an AI language model (OpenAI, Anthropic, Ollama)',
  category: 'ai',
  execute: async (config, input, ctx) => {
    if (ctx.abortSignal?.aborted) return makeResult(ctx.executionId, 'llm', null, 'error', 'Execution aborted')
    const provider = config.provider || 'openai'
    const model = config.model || 'gpt-4o'
    const systemPrompt = config.systemPrompt || ''
    const userMessage = typeof input === 'string' ? input : JSON.stringify(input)

    ctx.logger(`Calling ${provider} ${model}`)

    const messages: any[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: userMessage })

    if (provider === 'openai') {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY
      if (!apiKey) return makeResult(ctx.executionId, 'llm', null, 'error', 'OPENAI_API_KEY not configured')
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 60000)
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: controller.signal,
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, temperature: config.temperature ?? 0.7, max_tokens: config.maxTokens ?? 2048 }),
        })
        if (!res.ok) return makeResult(ctx.executionId, 'llm', null, 'error', `OpenAI error: ${res.status} ${res.statusText}`)
        const json: any = await res.json()
        const text = json.choices?.[0]?.message?.content || ''
        const usage = json.usage || {}
        return { ...makeResult(ctx.executionId, 'llm', text), tokenUsage: { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0, total: usage.total_tokens || 0 } }
      } finally { clearTimeout(timer) }
    }

    if (provider === 'anthropic') {
      const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY
      if (!apiKey) return makeResult(ctx.executionId, 'llm', null, 'error', 'ANTHROPIC_API_KEY not configured')
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 60000)
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: controller.signal,
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: model.replace('claude-', '') || 'claude-sonnet-4-20250514', max_tokens: config.maxTokens ?? 2048, system: systemPrompt || undefined, messages: [{ role: 'user', content: userMessage }] }),
        })
        if (!res.ok) return makeResult(ctx.executionId, 'llm', null, 'error', `Anthropic error: ${res.status} ${res.statusText}`)
        const json: any = await res.json()
        return makeResult(ctx.executionId, 'llm', json.content?.[0]?.text || '')
      } finally { clearTimeout(timer) }
    }

    return makeResult(ctx.executionId, 'llm', null, 'error', `Unsupported provider: ${provider}`)
  },
  configSchema: {
    provider: { type: 'select', options: ['openai', 'anthropic'], default: 'openai' },
    model: { type: 'string', default: 'gpt-4o' },
    systemPrompt: { type: 'text', default: '' },
    temperature: { type: 'number', default: 0.7 },
    maxTokens: { type: 'number', default: 2048 },
  },
})

function isPrivateHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') return true
  if (hostname.startsWith('127.') || hostname === '0.0.0.0') return true
  if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('169.254.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.toLowerCase() === '::1') return true
  return false
}

registerNode({
  type: 'http_request',
  label: 'HTTP Request',
  description: 'Make an HTTP request to an external URL (private/loopback blocked)',
  category: 'action',
  execute: async (config, input, ctx) => {
    if (ctx.abortSignal?.aborted) return makeResult(ctx.executionId, 'http_request', null, 'error', 'Execution aborted')
    const urlStr = config.url
    if (!urlStr) return makeResult(ctx.executionId, 'http_request', null, 'error', 'URL is required')

    let parsed: URL
    try { parsed = new URL(urlStr) } catch {
      return makeResult(ctx.executionId, 'http_request', null, 'error', 'Invalid URL')
    }

    if (isPrivateHostname(parsed.hostname)) {
      return makeResult(ctx.executionId, 'http_request', null, 'error', 'Requests to private/loopback addresses are blocked')
    }

    const allowedPrefixes = process.env.ALLOWED_URL_PREFIXES
    if (allowedPrefixes) {
      const prefixes = allowedPrefixes.split(',').map(s => s.trim()).filter(Boolean)
      if (prefixes.length > 0 && !prefixes.some(p => urlStr.startsWith(p))) {
        return makeResult(ctx.executionId, 'http_request', null, 'error', 'URL does not match ALLOWED_URL_PREFIXES')
      }
    }

    const method = config.method || 'GET'
    const headers = config.headers || {}
    const body = config.body || (method !== 'GET' ? JSON.stringify(input) : undefined)

    ctx.logger(`HTTP ${method} ${parsed.origin}`)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(urlStr, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) }, body: body as string | undefined })
      const text = await res.text()
      let data: any = text
      try { data = JSON.parse(text) } catch { }
      return makeResult(ctx.executionId, 'http_request', { status: res.status, data, headers: Object.fromEntries(res.headers.entries()) })
    } finally { clearTimeout(timer) }
  },
  configSchema: {
    url: { type: 'string', required: true },
    method: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
  },
})

registerNode({
  type: 'code',
  label: 'Execute Code',
  description: 'Run a JavaScript snippet (sandboxed, 5s timeout)',
  category: 'action',
  execute: async (config, input, ctx) => {
    const code = config.code
    if (!code) return makeResult(ctx.executionId, 'code', null, 'error', 'No code provided')
    if (ctx.abortSignal?.aborted) return makeResult(ctx.executionId, 'code', null, 'error', 'Execution aborted')
    try {
      const result = await executeSandboxed(code, input, ctx, 5000)
      return makeResult(ctx.executionId, 'code', result)
    } catch (err: any) {
      return makeResult(ctx.executionId, 'code', null, 'error', err.message)
    }
  },
  configSchema: {
    code: { type: 'code', default: 'return input' },
  },
})

registerNode({
  type: 'condition',
  label: 'Condition',
  description: 'Route execution based on a condition',
  category: 'logic',
  execute: async (config, input, ctx) => {
    const expression = String(config.expression || '')
    if (!expression) return makeResult(ctx.executionId, 'condition', { passed: true })

    if (getSandboxMode() === 'isolated') {
      try {
        const maxMemoryMb = parseInt(process.env.JSVM_MAX_MEMORY_MB || '64', 10)
        const result = await runInDeno(
          expression,
          { input },
          { timeoutMs: 3000, maxMemoryMb, mode: 'condition' }
        )
        if (result.logs?.length && ctx.logger) {
          for (const log of result.logs) ctx.logger(log)
        }
        if (!result.success) {
          return makeResult(ctx.executionId, 'condition', { passed: false, input }, 'error', result.error || 'Condition evaluation failed')
        }
        return makeResult(ctx.executionId, 'condition', { passed: !!result.result, input })
      } catch (err: any) {
        return makeResult(ctx.executionId, 'condition', { passed: false, input }, 'error', err.message)
      }
    }

    try {
      validateLegacyCode(expression)
    } catch {
      return makeResult(ctx.executionId, 'condition', { passed: false, input }, 'error', 'Expression contains blocked keywords')
    }
    try {
      const sandbox: Record<string, any> = {
        input,
        Boolean,
        process: undefined,
        require: undefined,
        global: undefined,
        globalThis: undefined,
        Reflect: undefined,
        Proxy: undefined,
        Function: undefined,
        Deno: undefined,
        __dirname: undefined,
        __filename: undefined,
      }
      const script = new vm.Script(`Boolean(${expression})`)
      const context = vm.createContext(sandbox)
      const passed = script.runInContext(context, { timeout: 3000 })
      return makeResult(ctx.executionId, 'condition', { passed, input })
    } catch (err: any) {
      return makeResult(ctx.executionId, 'condition', { passed: false, input }, 'error', err.message)
    }
  },
  outputs: 2,
})

registerNode({
  type: 'create_record',
  label: 'Create Record',
  description: 'Create a record in a TspoonBase collection',
  category: 'data',
  execute: async (config, input, ctx) => {
    if (!ctx.app) return makeResult(ctx.executionId, 'create_record', null, 'error', 'App context not available')
    const collection = config.collection
    if (!collection) return makeResult(ctx.executionId, 'create_record', null, 'error', 'Collection name is required')
    try {
      const data = typeof input === 'object' && input !== null ? input : {}
      const record = await ctx.app.collection(collection).create(data)
      return makeResult(ctx.executionId, 'create_record', record)
    } catch (err: any) {
      return makeResult(ctx.executionId, 'create_record', null, 'error', err.message)
    }
  },
})

registerNode({
  type: 'query_records',
  label: 'Query Records',
  description: 'Query records from a TspoonBase collection',
  category: 'data',
  execute: async (config, input, ctx) => {
    if (!ctx.app) return makeResult(ctx.executionId, 'query_records', null, 'error', 'App context not available')
    const collection = config.collection
    if (!collection) return makeResult(ctx.executionId, 'query_records', null, 'error', 'Collection name is required')
    try {
      const filter = config.filter || ''
      const sort = config.sort || '-created'
      const limit = config.limit || 50
      const page = config.page || 1
      const records = await ctx.app.collection(collection).getList(page, limit, { filter, sort })
      return makeResult(ctx.executionId, 'query_records', records)
    } catch (err: any) {
      return makeResult(ctx.executionId, 'query_records', null, 'error', err.message)
    }
  },
})

registerNode({
  type: 'output',
  label: 'Output',
  description: 'Return data as workflow output',
  category: 'output',
  execute: async (config, input, ctx) => {
    return makeResult(ctx.executionId, 'output', input)
  },
})

registerNode({
  type: 'delay',
  label: 'Delay',
  description: 'Wait for a specified duration',
  category: 'action',
  execute: async (config, input, ctx) => {
    const ms = Math.min(parseInt(config.durationMs) || 1000, 300000)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms)
      if (ctx.abortSignal) {
        ctx.abortSignal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Execution aborted')) }, { once: true })
      }
    })
    return makeResult(ctx.executionId, 'delay', { waited: ms, input })
  },
  configSchema: {
    durationMs: { type: 'number', default: 1000 },
  },
})
