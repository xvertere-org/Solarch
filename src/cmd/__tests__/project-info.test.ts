import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init'
import { runInfo, maskDatabaseUrl } from '../info'
import { runStatus } from '../status'
import * as doctorModule from '../doctor'

describe('Solarch Project Management Commands (info & status)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-info-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  describe('solarch info', () => {
    it('displays generated project metadata correctly', async () => {
      await runInit({
        yes: true,
        name: 'info-test-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'info-test-app')
      const report = await runInfo({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.name).toBe('info-test-app')
      expect(report.database.provider).toBe('SQLite')
      expect(report.authProviders).toContain('Email')
      expect(report.features).toContain('Rate Limiting')
      expect(report.projectDir).toBe(projectDir)
    })

    it('does not leak JWT secrets, encryption keys, or database passwords', async () => {
      const sensitivePassword = 'SuperSecretDbPassword123'
      const rawDbUrl = `postgres://admin:${sensitivePassword}@localhost:5432/proddb`

      await runInit({
        yes: true,
        name: 'secure-info-app',
        db: 'postgres',
        dbUrl: rawDbUrl,
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'secure-info-app')
      const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      const jwtSecretMatch = envContent.match(/JWT_SECRET=([a-f0-9]+)/)
      const encKeyMatch = envContent.match(/SOLARCH_ENCRYPTION_KEY=([a-f0-9]+)/)

      expect(jwtSecretMatch).toBeTruthy()
      const jwtSecret = jwtSecretMatch![1]
      const encKey = encKeyMatch![1]

      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runInfo({
        dir: projectDir,
        exitOnComplete: false,
      })

      // Output string inspection
      const loggedOutput = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n')

      expect(loggedOutput).not.toContain(jwtSecret)
      expect(loggedOutput).not.toContain(encKey)
      expect(loggedOutput).not.toContain(sensitivePassword)
      expect(loggedOutput).toContain('***')

      // Report object inspection
      expect(JSON.stringify(report)).not.toContain(jwtSecret)
      expect(JSON.stringify(report)).not.toContain(encKey)
      expect(JSON.stringify(report)).not.toContain(sensitivePassword)
      expect(report.database.url).toBe('postgres://admin:***@localhost:5432/proddb')
    })

    it('maskDatabaseUrl helper safely masks passwords in various connection strings', () => {
      expect(maskDatabaseUrl('postgres://root:secretPass@127.0.0.1:5432/mydb'))
        .toBe('postgres://root:***@127.0.0.1:5432/mydb')
      expect(maskDatabaseUrl('postgresql://usr:p%40ss@remote.db.net/test'))
        .toBe('postgresql://usr:***@remote.db.net/test')
      expect(maskDatabaseUrl(undefined)).toBeUndefined()
    })
  })

  describe('solarch status', () => {
    it('status passes on a valid initialized project', async () => {
      await runInit({
        yes: true,
        name: 'status-valid-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'status-valid-app')
      const report = await runStatus({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.checks.runtime.status).toBe('pass')
      expect(report.checks.configuration.status).toBe('pass')
      expect(report.checks.database.status).toBe('pass')
      expect(report.checks.migrations.status).toBe('warn') // Pending initial migration
      expect(report.checks.superuser.status).toBe('warn') // No superuser created yet
    })

    it('status detects invalid configuration and reports failures', async () => {
      const projectDir = path.join(tempBaseDir, 'broken-status-app')
      fs.mkdirSync(projectDir)
      // Write corrupted config file
      fs.writeFileSync(path.join(projectDir, 'solarch.config.json'), '{ malformed json syntax')

      const report = await runStatus({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.overallStatus).toBe('unhealthy')
      expect(report.checks.configuration.status).toBe('fail')
    })

    it('status works in JSON mode and outputs valid parseable JSON', async () => {
      await runInit({
        yes: true,
        name: 'status-json-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'status-json-app')
      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runStatus({
        dir: projectDir,
        json: true,
        exitOnComplete: false,
      })

      expect(report).toBeDefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"overallStatus"')
      )

      const jsonOutput = consoleSpy.mock.calls[0][0]
      const parsed = JSON.parse(jsonOutput)
      expect(parsed.checks.runtime.status).toBe('pass')
    })
  })
})
