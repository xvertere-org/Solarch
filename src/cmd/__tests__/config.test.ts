import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init'
import { runConfigShow, runConfigValidate, runConfigSet } from '../config'
import { execSync } from 'child_process'

describe('Solarch Configuration Management Commands (solarch config)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-config-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  describe('solarch config show', () => {
    it('1. config show displays resolved config', async () => {
      await runInit({
        yes: true,
        name: 'cfg-show-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'cfg-show-app')
      const report = await runConfigShow({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.project.name).toBe('cfg-show-app')
      expect(report.runtime.port).toBe(8090)
      expect(report.database.provider).toBe('sqlite')
      expect(report.auth.providers).toContain('email')
      expect(report.features.rateLimiting).toBe(true)
    })

    it('2. config show JSON does not leak secrets', async () => {
      const sensitivePassword = 'SuperSecretDbPassword789'
      const rawDbUrl = `postgres://admin:${sensitivePassword}@localhost:5432/cfgdb`

      await runInit({
        yes: true,
        name: 'cfg-json-app',
        db: 'postgres',
        dbUrl: rawDbUrl,
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'cfg-json-app')
      const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      const jwtMatch = envContent.match(/JWT_SECRET=([a-f0-9]+)/)
      const encMatch = envContent.match(/SOLARCH_ENCRYPTION_KEY=([a-f0-9]+)/)

      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runConfigShow({
        dir: projectDir,
        json: true,
        exitOnComplete: false,
      })

      const rawJson = JSON.stringify(report)
      if (jwtMatch) expect(rawJson).not.toContain(jwtMatch[1])
      if (encMatch) expect(rawJson).not.toContain(encMatch[1])
      expect(rawJson).not.toContain(sensitivePassword)
      expect(report.database.url).toBe('postgres://admin:****@localhost:5432/cfgdb')
    })
  })

  describe('solarch config validate', () => {
    it('3. config validate passes initialized project', async () => {
      await runInit({
        yes: true,
        name: 'cfg-val-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'cfg-val-app')
      const report = await runConfigValidate({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(true)
      expect(report.checks.every(c => c.status === 'pass')).toBe(true)
    })

    it('4. config validate fails missing secret', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-no-secret-app')
      fs.mkdirSync(projectDir)
      // Only set encryption key, no JWT secret
      fs.writeFileSync(
        path.join(projectDir, '.env'),
        'SOLARCH_ENCRYPTION_KEY=12345678901234567890123456789012\n'
      )

      const report = await runConfigValidate({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(false)
      const secCheck = report.checks.find(c => c.id === 'security')
      expect(secCheck?.status).toBe('fail')
    })

    it('5. config validate detects invalid database URL', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-bad-db-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(
        path.join(projectDir, '.env'),
        'SOLARCH_JWT_SECRET=0123456789012345678901234567890123456789\nSOLARCH_ENCRYPTION_KEY=abcdef1234567890abcdef1234567890\nDATABASE_URL=invalid-protocol://host/db\n'
      )

      const report = await runConfigValidate({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(false)
      const dbCheck = report.checks.find(c => c.id === 'database')
      expect(dbCheck?.status).toBe('fail')
    })
  })

  describe('solarch config set', () => {
    it('6. config set updates JSON config', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-set-json-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(
        path.join(projectDir, 'solarch.config.json'),
        JSON.stringify({ port: 8090, database: { type: 'sqlite' } }, null, 2)
      )

      const result1 = await runConfigSet({
        dir: projectDir,
        key: 'port',
        value: '9000',
        exitOnComplete: false,
      })

      expect(result1.updated).toBe(true)
      expect(result1.value).toBe(9000)

      const result2 = await runConfigSet({
        dir: projectDir,
        key: 'features.ai',
        value: 'true',
        exitOnComplete: false,
      })

      expect(result2.updated).toBe(true)
      expect(result2.value).toBe(true)

      const updatedJson = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'solarch.config.json'), 'utf-8')
      )
      expect(updatedJson.port).toBe(9000)
      expect(updatedJson.ai?.enabled).toBe(true)
    })

    it('7. config set rejects forbidden secret fields', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-forbid-app')
      fs.mkdirSync(projectDir)

      await expect(
        runConfigSet({
          dir: projectDir,
          key: 'jwt_secret',
          value: 'should-fail-hard',
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Cannot set secrets with 'solarch config set'/)

      await expect(
        runConfigSet({
          dir: projectDir,
          key: 'encryption_key',
          value: 'should-also-fail',
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Cannot set secrets with 'solarch config set'/)
    })

    it('8. config set rejects unsupported keys', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-unsupported-app')
      fs.mkdirSync(projectDir)

      await expect(
        runConfigSet({
          dir: projectDir,
          key: 'random.unsupported.field',
          value: 'value',
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Unsupported configuration key/)
    })

    it('9. config set refuses TS config mutation', async () => {
      const projectDir = path.join(tempBaseDir, 'cfg-ts-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(
        path.join(projectDir, 'solarch.config.ts'),
        'export default { port: 8090 }\n'
      )

      const result = await runConfigSet({
        dir: projectDir,
        key: 'port',
        value: '9999',
        exitOnComplete: false,
      })

      expect(result.updated).toBe(false)
      expect(result.manualUpdateRequired).toBe(true)
      expect(result.message).toContain('Manual update required')

      // Verify TS file was NOT mutated
      const tsContent = fs.readFileSync(path.join(projectDir, 'solarch.config.ts'), 'utf-8')
      expect(tsContent).toBe('export default { port: 8090 }\n')
    })

    it('10. CLI help output works', () => {
      const cliPath = path.join(__dirname, '..', '..', 'cli.ts')
      const helpOutput = execSync(`npx tsx "${cliPath}" config --help`, {
        encoding: 'utf-8',
      })

      expect(helpOutput).toContain('Usage: solarch config')
      expect(helpOutput).toContain('show')
      expect(helpOutput).toContain('validate')
      expect(helpOutput).toContain('set')
    })
  })
})
