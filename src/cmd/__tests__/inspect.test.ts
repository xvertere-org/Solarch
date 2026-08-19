import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init'
import {
  runInspectProject,
  runInspectDatabase,
  runInspectFeatures,
  runInspectDependencies,
} from '../inspect'
import { execSync } from 'child_process'

describe('Solarch Project Inspection Commands (solarch inspect)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-inspect-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  describe('solarch inspect project', () => {
    it('1. inspect project returns metadata', async () => {
      await runInit({
        yes: true,
        name: 'inspect-meta-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-meta-app')
      const report = await runInspectProject({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.projectName).toBe('inspect-meta-app')
      expect(report.configFile).toBe('solarch.config.ts')
      expect(report.nodeVersion).toBe(process.version)
      expect(report.platform).toBeDefined()
      expect(report.environment).toBe('development')
    })

    it('2. inspect project JSON contains no secrets', async () => {
      const sensitivePassword = 'SuperSecretDbPasswordInspect'
      const rawDbUrl = `postgres://admin:${sensitivePassword}@localhost:5432/inspectdb`

      await runInit({
        yes: true,
        name: 'inspect-secure-app',
        db: 'postgres',
        dbUrl: rawDbUrl,
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-secure-app')
      const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      const jwtMatch = envContent.match(/JWT_SECRET=([a-f0-9]+)/)
      const encMatch = envContent.match(/SOLARCH_ENCRYPTION_KEY=([a-f0-9]+)/)

      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runInspectProject({
        dir: projectDir,
        json: true,
        exitOnComplete: false,
      })

      const rawJson = JSON.stringify(report)
      if (jwtMatch) expect(rawJson).not.toContain(jwtMatch[1])
      if (encMatch) expect(rawJson).not.toContain(encMatch[1])
      expect(rawJson).not.toContain(sensitivePassword)
      expect(report.projectName).toBe('inspect-secure-app')
    })
  })

  describe('solarch inspect database', () => {
    it('3. inspect database detects sqlite', async () => {
      await runInit({
        yes: true,
        name: 'inspect-sqlite-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-sqlite-app')
      const report = await runInspectDatabase({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.provider).toBe('sqlite')
      expect(report.storage).toBe('./pb_data')
      expect(report.status).toBe('connected')
      expect(report.capabilities).toContain('transactions')
      expect(report.capabilities).toContain('wal')
    })

    it('4. inspect database masks credentials', async () => {
      const sensitivePassword = 'TopSecretPostgresPassword999'
      const rawDbUrl = `postgres://appuser:${sensitivePassword}@127.0.0.1:5432/productiondb`

      await runInit({
        yes: true,
        name: 'inspect-pg-app',
        db: 'postgres',
        dbUrl: rawDbUrl,
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-pg-app')
      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runInspectDatabase({
        dir: projectDir,
        exitOnComplete: false,
      })

      const loggedOutput = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n')

      expect(loggedOutput).not.toContain(sensitivePassword)
      expect(report.url).toBe('postgres://appuser:****@127.0.0.1:5432/productiondb')
      expect(report.host).toBe('127.0.0.1:5432')
      expect(report.database).toBe('productiondb')
      expect(report.capabilities).toContain('pooling')
    })
  })

  describe('solarch inspect features', () => {
    it('5. inspect features matches config', async () => {
      await runInit({
        yes: true,
        name: 'inspect-feat-app',
        auth: 'email,google,github',
        rateLimit: 'true',
        ai: 'true',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-feat-app')
      const report = await runInspectFeatures({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.auth.providers).toContain('email')
      expect(report.auth.providers).toContain('google')
      expect(report.auth.providers).toContain('github')
      expect(report.rateLimiting.enabled).toBe(true)
      expect(report.ai.enabled).toBe(true)
      expect(report.realtime.enabled).toBe(true)
      expect(report.hooks.enabled).toBe(true)
    })
  })

  describe('solarch inspect dependencies', () => {
    it('6. inspect dependencies validates runtime', async () => {
      await runInit({
        yes: true,
        name: 'inspect-deps-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'inspect-deps-app')
      const report = await runInspectDependencies({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.node.compatible).toBe(true)
      expect(report.node.version).toBe(process.version)
      expect(report.solarch.version).toBeDefined()
      expect(report.databaseDriver.available).toBe(true)
      expect(report.coreClient.available).toBe(true)
      expect(report.overallCompatible).toBe(true)
    })
  })

  describe('CLI Help & Error Invariants', () => {
    it('7. CLI help works', () => {
      const cliPath = path.join(__dirname, '..', '..', 'cli.ts')
      const helpOutput = execSync(`npx tsx "${cliPath}" inspect --help`, {
        encoding: 'utf-8',
      })

      expect(helpOutput).toContain('Usage: solarch inspect')
      expect(helpOutput).toContain('project')
      expect(helpOutput).toContain('database')
      expect(helpOutput).toContain('features')
      expect(helpOutput).toContain('dependencies')
    })

    it('8. Invalid project returns exit code 1', async () => {
      const nonExistentDir = path.join(tempBaseDir, 'does-not-exist-dir')

      await expect(
        runInspectProject({
          dir: nonExistentDir,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Project directory does not exist/)

      await expect(
        runInspectDatabase({
          dir: nonExistentDir,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Project directory does not exist/)
    })
  })
})
