import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EnvMerger } from '../sync/env-merger.js'

describe('EnvMerger (Phase 3)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-env-merger-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. merges platform variables while preserving local developer variables', () => {
    const existing = [
      'PORT=8090',
      'LOCAL_DEV_SECRET=super-secret-local-val',
      'SHARED_VAR=local_value',
    ].join('\n')

    const remote = {
      SHARED_VAR: 'remote_value',
      PLATFORM_API_KEY: 'plat_key_123',
      DATABASE_URL: 'postgres://user:pass@cloud.db.internal/prod',
    }

    const result = EnvMerger.merge(existing, remote, { environment: 'development', force: false })

    expect(result.added).toContain('PLATFORM_API_KEY')
    expect(result.added).toContain('DATABASE_URL')
    expect(result.preserved).toContain('PORT')
    expect(result.preserved).toContain('LOCAL_DEV_SECRET')
    expect(result.preserved).toContain('SHARED_VAR') // kept local value

    expect(result.content).toContain('PORT=8090')
    expect(result.content).toContain('LOCAL_DEV_SECRET=super-secret-local-val')
    expect(result.content).toContain('SHARED_VAR=local_value')
    expect(result.content).toContain('PLATFORM_API_KEY=plat_key_123')
    expect(result.content).toContain('# Solarch Platform Managed (development)')
  })

  it('2. updates existing variable when force: true is provided', () => {
    const existing = 'SHARED_VAR=local_value\n'
    const remote = { SHARED_VAR: 'remote_value' }

    const result = EnvMerger.merge(existing, remote, { environment: 'development', force: true })

    expect(result.updated).toContain('SHARED_VAR')
    expect(result.content).toContain('SHARED_VAR=remote_value')
  })

  it('3. writes .env file with 0o600 permissions', async () => {
    const filePath = path.join(tempDir, '.env')
    await EnvMerger.writeEnvFile(filePath, 'TEST_VAR=123\n')

    expect(fs.existsSync(filePath)).toBe(true)

    if (os.platform() !== 'win32') {
      const stats = fs.statSync(filePath)
      expect(stats.mode & 0o777).toBe(0o600)
    }
  })
})
