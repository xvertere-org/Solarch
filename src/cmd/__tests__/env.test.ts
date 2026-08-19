import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init'
import { runEnvCheck, runEnvGenerate, runEnvShow } from '../env'
import { maskDatabaseUrl, isSensitiveKey, maskEnvValue } from '../env/masking'

describe('Solarch Environment Management Commands (solarch env)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-env-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  describe('solarch env check', () => {
    it('1. env check passes on valid initialized project', async () => {
      await runInit({
        yes: true,
        name: 'valid-env-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'valid-env-app')
      const report = await runEnvCheck({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(true)
      const jwtCheck = report.checks.find(c => c.id === 'jwt_secret')
      const encCheck = report.checks.find(c => c.id === 'encryption_key')
      expect(jwtCheck?.status).toBe('pass')
      expect(encCheck?.status).toBe('pass')
    })

    it('2. env check fails when JWT secret missing', async () => {
      const projectDir = path.join(tempBaseDir, 'missing-jwt-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(
        path.join(projectDir, '.env'),
        'SOLARCH_ENCRYPTION_KEY=12345678901234567890123456789012\n'
      )

      const report = await runEnvCheck({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(false)
      const jwtCheck = report.checks.find(c => c.id === 'jwt_secret')
      expect(jwtCheck?.status).toBe('fail')
      expect(jwtCheck?.message).toContain('missing')
    })

    it('3. env check detects invalid DATABASE_URL', async () => {
      const projectDir = path.join(tempBaseDir, 'invalid-db-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(
        path.join(projectDir, '.env'),
        'SOLARCH_JWT_SECRET=0123456789012345678901234567890123456789\nSOLARCH_ENCRYPTION_KEY=abcdef1234567890abcdef1234567890\nDATABASE_URL=mysql://user:pass@localhost/db\n'
      )

      const report = await runEnvCheck({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.valid).toBe(false)
      const dbCheck = report.checks.find(c => c.id === 'database_url')
      expect(dbCheck?.status).toBe('fail')
      expect(dbCheck?.message).toContain('invalid format')
    })
  })

  describe('solarch env generate', () => {
    it('4. env generate creates missing secrets', async () => {
      const projectDir = path.join(tempBaseDir, 'gen-env-app')
      fs.mkdirSync(projectDir)
      fs.writeFileSync(path.join(projectDir, '.env'), '# Custom comments\nPORT=8090\n')

      const result = await runEnvGenerate({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(result.updated).toBe(true)
      expect(result.generatedKeys).toContain('JWT_SECRET')
      expect(result.generatedKeys).toContain('SOLARCH_JWT_SECRET')
      expect(result.generatedKeys).toContain('SOLARCH_ENCRYPTION_KEY')

      const content = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      expect(content).toContain('# Custom comments')
      expect(content).toContain('PORT=8090')
      expect(content).toContain('SOLARCH_JWT_SECRET=')
      expect(content).toContain('SOLARCH_ENCRYPTION_KEY=')
    })

    it('5. env generate does not overwrite existing secrets', async () => {
      const projectDir = path.join(tempBaseDir, 'preserve-env-app')
      fs.mkdirSync(projectDir)
      const originalJwt = 'my-existing-custom-jwt-secret-at-least-32-chars-long'
      const originalKey = 'my-existing-custom-encryption-key-value'

      fs.writeFileSync(
        path.join(projectDir, '.env'),
        `SOLARCH_JWT_SECRET=${originalJwt}\nSOLARCH_ENCRYPTION_KEY=${originalKey}\n`
      )

      const result = await runEnvGenerate({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(result.skippedKeys).toContain('SOLARCH_JWT_SECRET')
      expect(result.skippedKeys).toContain('SOLARCH_ENCRYPTION_KEY')

      const content = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      expect(content).toContain(originalJwt)
      expect(content).toContain(originalKey)
    })

    it('6. env generate --force replaces secrets after confirmation', async () => {
      const projectDir = path.join(tempBaseDir, 'force-env-app')
      fs.mkdirSync(projectDir)
      const originalJwt = 'my-old-jwt-secret-that-will-be-replaced-32-chars'
      const originalKey = 'my-old-encryption-key-that-will-be-replaced'

      fs.writeFileSync(
        path.join(projectDir, '.env'),
        `SOLARCH_JWT_SECRET=${originalJwt}\nSOLARCH_ENCRYPTION_KEY=${originalKey}\n`
      )

      const result = await runEnvGenerate({
        dir: projectDir,
        force: true,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.overwritten).toBe(true)
      expect(result.generatedKeys).toContain('SOLARCH_JWT_SECRET')
      expect(result.generatedKeys).toContain('SOLARCH_ENCRYPTION_KEY')

      const content = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      expect(content).not.toContain(originalJwt)
      expect(content).not.toContain(originalKey)
    })
  })

  describe('solarch env show', () => {
    it('7. env show masks sensitive values in terminal output', async () => {
      const projectDir = path.join(tempBaseDir, 'show-env-app')
      fs.mkdirSync(projectDir)
      const sensitiveJwt = 'super-secret-jwt-token-value-must-be-hidden-completely'
      const sensitiveEnc = 'super-secret-encryption-key-hidden'
      const dbPass = 'MyUltraSecretPassword123'

      fs.writeFileSync(
        path.join(projectDir, '.env'),
        `SOLARCH_JWT_SECRET=${sensitiveJwt}\nSOLARCH_ENCRYPTION_KEY=${sensitiveEnc}\nDATABASE_URL=postgres://appuser:${dbPass}@127.0.0.1:5432/maindb\n`
      )

      const consoleSpy = vi.spyOn(console, 'log')

      const report = await runEnvShow({
        dir: projectDir,
        exitOnComplete: false,
      })

      const loggedOutput = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n')

      expect(loggedOutput).not.toContain(sensitiveJwt)
      expect(loggedOutput).not.toContain(sensitiveEnc)
      expect(loggedOutput).not.toContain(dbPass)
      expect(loggedOutput).toContain('configured')
      expect(loggedOutput).toContain('postgres://appuser:****@127.0.0.1:5432/maindb')
    })

    it('8. env show JSON mode does not leak secrets', async () => {
      const projectDir = path.join(tempBaseDir, 'show-json-app')
      fs.mkdirSync(projectDir)
      const sensitiveJwt = 'raw-jwt-secret-that-must-never-be-in-json'
      const dbPass = 'TopSecretDbPassword456'

      fs.writeFileSync(
        path.join(projectDir, '.env'),
        `SOLARCH_JWT_SECRET=${sensitiveJwt}\nDATABASE_URL=postgres://dbuser:${dbPass}@remote.db:5432/app\n`
      )

      const consoleSpy = vi.spyOn(console, 'log')

      const result = await runEnvShow({
        dir: projectDir,
        json: true,
        exitOnComplete: false,
      })

      const rawJson = JSON.stringify(result)
      expect(rawJson).not.toContain(sensitiveJwt)
      expect(rawJson).not.toContain(dbPass)
      expect(result.variables.SOLARCH_JWT_SECRET).toBe('configured')
      expect(result.variables.DATABASE_URL).toBe('postgres://dbuser:****@remote.db:5432/app')
    })

    it('central masking utilities mask database URLs and sensitive keys accurately', () => {
      expect(isSensitiveKey('SOLARCH_JWT_SECRET')).toBe(true)
      expect(isSensitiveKey('SOLARCH_ENCRYPTION_KEY')).toBe(true)
      expect(isSensitiveKey('GOOGLE_CLIENT_SECRET')).toBe(true)
      expect(isSensitiveKey('PORT')).toBe(false)

      expect(maskDatabaseUrl('postgres://user:mypassword@localhost:5432/test'))
        .toBe('postgres://user:****@localhost:5432/test')
      expect(maskEnvValue('JWT_SECRET', 'secret123')).toBe('configured')
      expect(maskEnvValue('PORT', '8090')).toBe('8090')
    })
  })
})
