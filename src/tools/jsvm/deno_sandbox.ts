import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const MAX_CONCURRENT_SANDBOXES = parseInt(process.env.JSVM_MAX_CONCURRENT || '8', 10)


const MAX_STDOUT_BYTES = 1024 * 1024


const MAX_STDERR_BYTES = 64 * 1024

const DENO_BINARY = (() => {

  const productionPath = '/usr/local/bin/deno'
  try {
    fs.accessSync(productionPath, fs.constants.X_OK)
    return productionPath
  } catch {

    return 'deno'
  }
})()

let activeSandboxes = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeSandboxes < MAX_CONCURRENT_SANDBOXES) {
    activeSandboxes++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeSandboxes++
      resolve()
    })
  })
}

function releaseSlot(): void {
  activeSandboxes--
  const next = waitQueue.shift()
  if (next) next()
}

export interface SandboxOptions {
  timeoutMs?: number
  maxMemoryMb?: number
  mode?: 'hook' | 'code' | 'condition'
}

export interface SandboxResult {
  success: boolean
  result?: any
  error?: string
  logs: string[]
}

export interface SerializableContext {
  settings?: Record<string, any>
  collections?: Array<{ id: string; name: string; type: string; fields: any[] }>
  input?: any
  [key: string]: any
}

function resolveWorkerPath(): string {
  const candidates = [
    path.join(__dirname, 'deno_worker.ts'),
    path.join(process.cwd(), 'dist', 'tools', 'jsvm', 'deno_worker.ts'),
    path.join(process.cwd(), 'src', 'tools', 'jsvm', 'deno_worker.ts'),
  ]

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.R_OK)
      return candidate
    } catch {
    }
  }


  throw new Error(
    `[JSVM] Cannot find deno_worker.ts. Searched:\n${candidates.map(c => `  - ${c}`).join('\n')}\n` +
    'Ensure deno_worker.ts is copied to the dist/ directory during build.'
  )
}


function readWorkerScript(): string {
  const workerPath = resolveWorkerPath()
  return fs.readFileSync(workerPath, 'utf-8')
}

export async function runInDeno(
  code: string,
  context: SerializableContext = {},
  options: SandboxOptions = {}
): Promise<SandboxResult> {
  const {
    timeoutMs = 5000,
    maxMemoryMb = Math.max(16, Math.min(parseInt(process.env.JSVM_MAX_MEMORY_MB || '64', 10), 512)),
    mode = 'code',
  } = options
  const clampedTimeout = Math.max(100, Math.min(timeoutMs, 30000))

  await acquireSlot()

  try {
    return await _executeInDeno(code, context, clampedTimeout, maxMemoryMb, mode)
  } finally {
    releaseSlot()
  }
}

async function _executeInDeno(
  code: string,
  context: SerializableContext,
  timeoutMs: number,
  maxMemoryMb: number,
  mode: string
): Promise<SandboxResult> {
  let workerScript: string
  try {
    workerScript = readWorkerScript()
  } catch (err: any) {
    return { success: false, error: err.message, logs: [] }
  }
  const payloadJson = JSON.stringify({ code, context, mode })
  const payloadBase64 = Buffer.from(payloadJson).toString('base64')
  const patchedWorkerScript = workerScript.replace(
    /^async function readStdin\(\).*?^}/ms,
    `async function readStdin(): Promise<string> {\n  return new TextDecoder().decode(Deno.decodeBase64("${payloadBase64}"));\n}`
  )

  const args = [
    'run',
    '--no-prompt',
    '--deny-net',
    '--deny-read',
    '--deny-write',
    '--deny-env',
    '--deny-run',
    '--deny-ffi',
    '--deny-hrtime',
    `--v8-flags=--max-old-space-size=${maxMemoryMb}`,
    '-',
  ]

  return new Promise<SandboxResult>((resolve) => {
    let stdout = ''
    let stdoutBytes = 0
    let stderr = ''
    let stderrBytes = 0
    let killed = false
    let finished = false

    const child = spawn(DENO_BINARY, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        HOME: process.env.HOME || process.env.USERPROFILE || '/tmp',
        PATH: DENO_BINARY !== 'deno' ? path.dirname(DENO_BINARY) : (process.env.PATH || ''),
        DENO_NO_UPDATE_CHECK: '1',
      },
      detached: false,
    })
    const timeoutHandle = setTimeout(() => {
      if (!finished) {
        killed = true
        try {
          child.kill('SIGKILL')
        } catch {
        }
      }
    }, timeoutMs + 500)

    child.stdout.on('data', (data: Buffer) => {
      if (stdoutBytes < MAX_STDOUT_BYTES) {
        const remaining = MAX_STDOUT_BYTES - stdoutBytes
        const chunk = data.length <= remaining ? data.toString() : data.slice(0, remaining).toString()
        stdout += chunk
        stdoutBytes += data.length
      }
    })
    child.stderr.on('data', (data: Buffer) => {
      if (stderrBytes < MAX_STDERR_BYTES) {
        const remaining = MAX_STDERR_BYTES - stderrBytes
        const chunk = data.length <= remaining ? data.toString() : data.slice(0, remaining).toString()
        stderr += chunk
        stderrBytes += data.length
      }
    })

    child.on('error', (err: Error) => {
      if (finished) return
      finished = true
      clearTimeout(timeoutHandle)
      resolve({
        success: false,
        error: `Failed to spawn Deno subprocess: ${err.message}. Is Deno installed?`,
        logs: [],
      })
    })

    child.on('close', (exitCode: number | null) => {
      if (finished) return
      finished = true
      clearTimeout(timeoutHandle)

      if (killed) {
        resolve({
          success: false,
          error: `Code execution timed out after ${timeoutMs}ms`,
          logs: [],
        })
        return
      }
      const trimmed = stdout.trim()
      if (!trimmed) {
        resolve({
          success: false,
          error: exitCode !== 0
            ? `Deno process exited with code ${exitCode}: ${stderr.trim().slice(0, 500) || 'unknown error'}`
            : 'No output from sandbox',
          logs: [],
        })
        return
      }

      try {
        const lines = trimmed.split('\n').filter(l => l.trim())
        const lastLine = lines[lines.length - 1]
        const result: SandboxResult = JSON.parse(lastLine)
        resolve(result)
      } catch {
        resolve({
          success: false,
          error: `Failed to parse sandbox output: ${trimmed.substring(0, 200)}`,
          logs: [],
        })
      }
    })
    try {
      child.stdin.write(patchedWorkerScript, () => {
        child.stdin.end()
      })
    } catch (err: any) {
      if (!finished) {
        finished = true
        clearTimeout(timeoutHandle)
        resolve({
          success: false,
          error: `Failed to write to Deno stdin: ${err.message}`,
          logs: [],
        })
      }
    }
  })
}

export function checkDenoAvailability(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(DENO_BINARY, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })

    let output = ''
    child.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      if (code === 0 && output.includes('deno')) {
        const match = output.match(/deno\s+(\d+\.\d+\.\d+)/)
        resolve(match ? match[1] : output.trim().split('\n')[0])
      } else {
        resolve(null)
      }
    })
  })
}


export function sanitizeSettingsForSandbox(settings: any): Record<string, any> {
  if (!settings) return {}
  const SAFE_SETTINGS_KEYS = [
    'appName', 'appUrl', 'senderName', 'senderAddress',
    'hideControls', 'recordsPerPage', 'defaultLanguage',
  ]

  const safe: Record<string, any> = {}
  for (const key of SAFE_SETTINGS_KEYS) {
    if (key in settings) {
      safe[key] = settings[key]
    }
  }
  return safe
}
