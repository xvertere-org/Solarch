import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import { runInit } from '../init'
import { DevRunner, DevWatcher, runDev } from '../dev'
import { execSync } from 'child_process'

describe('Solarch Development Server (solarch dev)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-dev-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  it('1. dev runs doctor before server', async () => {
    // Broken directory with invalid configuration syntax
    const brokenDir = path.join(tempBaseDir, 'broken-dev-app')
    fs.mkdirSync(brokenDir)
    fs.writeFileSync(path.join(brokenDir, 'solarch.config.json'), '{ "port": invalid }')

    const runner = new DevRunner({
      dir: brokenDir,
      exitOnComplete: false,
      watch: false,
    })

    const preflightOk = await runner.preflight()
    expect(preflightOk).toBe(false)

    await expect(runner.start()).rejects.toThrow(/Preflight validation failed/)
  })

  it('2. dev starts server lifecycle', async () => {
    await runInit({
      yes: true,
      name: 'dev-lifecycle-app',
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'dev-lifecycle-app')
    const testPort = 18091

    const runner = new DevRunner({
      dir: projectDir,
      port: testPort,
      watch: false,
      exitOnComplete: false,
    })

    await runner.start()
    const state = runner.getState()

    expect(state.isRunning).toBe(true)
    expect(state.port).toBe(testPort)

    // Make an HTTP health check request
    const res = await new Promise<{ statusCode?: number }>((resolve) => {
      http.get(`http://localhost:${testPort}/api/health`, (res) => {
        resolve({ statusCode: res.statusCode })
      })
    })

    expect(res.statusCode).toBe(200)

    await runner.stop()
    expect(runner.getState().isRunning).toBe(false)
  })

  it('3. restart command works', async () => {
    await runInit({
      yes: true,
      name: 'dev-restart-app',
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'dev-restart-app')
    const testPort = 18092

    const runner = new DevRunner({
      dir: projectDir,
      port: testPort,
      watch: false,
      exitOnComplete: false,
    })

    await runner.start()

    // Trigger restart
    await runner.restart('unit test triggered restart')
    expect(runner.getState().isRunning).toBe(true)

    // Verify server is alive after restart
    const res = await new Promise<{ statusCode?: number }>((resolve) => {
      http.get(`http://localhost:${testPort}/api/health`, (res) => {
        resolve({ statusCode: res.statusCode })
      })
    })

    expect(res.statusCode).toBe(200)

    await runner.stop()
  })

  it('4. watcher detects file changes', async () => {
    const projectDir = path.join(tempBaseDir, 'dev-watcher-app')
    fs.mkdirSync(projectDir)
    fs.mkdirSync(path.join(projectDir, 'src'))

    let changedFileDetected = ''
    const watcher = new DevWatcher({
      cwd: projectDir,
      onChange: (file) => {
        changedFileDetected = file
      },
    })

    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Trigger a change
    fs.writeFileSync(path.join(projectDir, 'src', 'app.ts'), '// updated code')

    // Wait for debounced watcher
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(changedFileDetected).toContain('src')
    watcher.close()
  })

  it('5. SIGINT cleanup works', async () => {
    await runInit({
      yes: true,
      name: 'dev-cleanup-app',
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'dev-cleanup-app')
    const testPort = 18093

    const runner = new DevRunner({
      dir: projectDir,
      port: testPort,
      watch: false,
      exitOnComplete: false,
    })

    await runner.start()
    expect(runner.getState().isRunning).toBe(true)

    // Call stop directly (same as SIGINT handler)
    await runner.stop()
    expect(runner.getState().isRunning).toBe(false)
  })

  it('6. --no-watch disables watcher', async () => {
    await runInit({
      yes: true,
      name: 'dev-nowatch-app',
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'dev-nowatch-app')
    const testPort = 18094

    const runner = new DevRunner({
      dir: projectDir,
      port: testPort,
      watch: false,
      exitOnComplete: false,
    })

    await runner.start()
    const state = runner.getState()

    expect(state.watching).toBe(false)
    await runner.stop()
  })

  it('7. CLI help works', () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli.ts')
    const helpOutput = execSync(`npx tsx "${cliPath}" dev --help`, {
      encoding: 'utf-8',
    })

    expect(helpOutput).toContain('Usage: solarch dev')
    expect(helpOutput).toContain('--port')
    expect(helpOutput).toContain('--dir')
    expect(helpOutput).toContain('--no-watch')
    expect(helpOutput).toContain('--verbose')
  })
})
