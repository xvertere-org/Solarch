import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanRoutes, runRoutes, formatMethod } from '../routes/index.js'

describe('solarch routes Command & API Surface Discovery', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-routes-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. scans standard routes, realtime endpoints, and middleware', () => {
    const report = scanRoutes()

    expect(report.routes.length).toBeGreaterThan(10)
    expect(report.realtime.length).toBeGreaterThanOrEqual(2)
    expect(report.middleware).toContain('auth')
    expect(report.middleware).toContain('rate-limit')
    expect(report.middleware).toContain('cors')

    const hasUsersRoute = report.routes.some(r => r.path.includes('/api/collections/:c/records'))
    expect(hasUsersRoute).toBe(true)

    const hasWsRoute = report.realtime.some(rt => rt.path === '/realtime')
    expect(hasWsRoute).toBe(true)
  })

  it('2. formats HTTP methods with color and spacing', () => {
    const getFormatted = formatMethod('GET')
    expect(getFormatted).toContain('GET')

    const postFormatted = formatMethod('POST')
    expect(postFormatted).toContain('POST')

    const wsFormatted = formatMethod('WS')
    expect(wsFormatted).toContain('WS')
  })

  it('3. runRoutes returns valid JSON structure', async () => {
    const report = await runRoutes({
      dir: tempDir,
      json: true,
      exitOnComplete: false,
    })

    expect(report).toBeDefined()
    expect(Array.isArray(report.routes)).toBe(true)
    expect(Array.isArray(report.realtime)).toBe(true)
    expect(Array.isArray(report.middleware)).toBe(true)
  })

  it('4. throws error for non-existent directory', async () => {
    const nonExistent = path.join(tempDir, 'does-not-exist-12345')
    await expect(
      runRoutes({
        dir: nonExistent,
        exitOnComplete: false,
      })
    ).rejects.toThrow('Project directory does not exist')
  })
})
