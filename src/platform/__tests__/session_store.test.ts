import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SessionStore } from '../auth/session-store.js'

describe('Platform SessionStore (Phase 2)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-session-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. correctly saves, loads, and clears session credentials', async () => {
    const store = new SessionStore(tempDir)
    expect(await store.loadCredentials()).toBeNull()

    const credentials = {
      accessToken: 'test-access-token-12345',
      refreshToken: 'test-refresh-token-67890',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    }

    await store.saveCredentials(credentials)
    const loaded = await store.loadCredentials()

    expect(loaded).toBeDefined()
    expect(loaded?.accessToken).toBe(credentials.accessToken)
    expect(loaded?.refreshToken).toBe(credentials.refreshToken)
    expect(loaded?.expiresAt).toBe(credentials.expiresAt)

    await store.clearCredentials()
    expect(await store.loadCredentials()).toBeNull()
  })

  it('2. enforces 0o600 file permissions on POSIX systems', async () => {
    const store = new SessionStore(tempDir)
    await store.saveCredentials({
      accessToken: 'secret-token-xyz',
    })

    const filePath = store.getSessionFilePath()
    expect(fs.existsSync(filePath)).toBe(true)

    if (os.platform() !== 'win32') {
      const stats = fs.statSync(filePath)
      const mode = stats.mode & 0o777
      expect(mode).toBe(0o600)
    }
  })

  it('3. handles corrupted/malformed session JSON safely', async () => {
    const store = new SessionStore(tempDir)
    const filePath = store.getSessionFilePath()

    fs.mkdirSync(tempDir, { recursive: true })
    fs.writeFileSync(filePath, '{ invalid json: broken', 'utf-8')

    const loaded = await store.loadCredentials()
    expect(loaded).toBeNull()
  })

  it('4. respects SOLARCH_CONFIG_DIR environment variable', () => {
    const customDir = path.join(tempDir, 'custom-config')
    const originalEnv = process.env.SOLARCH_CONFIG_DIR

    try {
      process.env.SOLARCH_CONFIG_DIR = customDir
      const store = new SessionStore()
      expect(store.getConfigDir()).toBe(path.resolve(customDir))
      expect(store.getSessionFilePath()).toBe(path.join(path.resolve(customDir), 'session.json'))
    } finally {
      if (originalEnv !== undefined) {
        process.env.SOLARCH_CONFIG_DIR = originalEnv
      } else {
        delete process.env.SOLARCH_CONFIG_DIR
      }
    }
  })
})
