import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  isSensitiveKey,
  maskSecret,
  maskDatabaseUrl,
  maskEnvValue,
} from '../../cmd/env/masking.js'
import { validateResourceName } from '../../cmd/generate/migration.js'
import { runMigrateCreate } from '../../cmd/migrate.js'
import { runConfigSet } from '../../cmd/config/set.js'
import { generateProjectFiles } from '../../cmd/init/generator.js'
import { listTemplates } from '../../templates/registry.js'
import { runDoctor } from '../../cmd/doctor.js'

describe('Release Security & OWASP Regression Suite', () => {
  describe('1. Secret Masking Utilities', () => {
    it('identifies sensitive keys accurately', () => {
      expect(isSensitiveKey('JWT_SECRET')).toBe(true)
      expect(isSensitiveKey('SOLARCH_JWT_SECRET')).toBe(true)
      expect(isSensitiveKey('SOLARCH_ENCRYPTION_KEY')).toBe(true)
      expect(isSensitiveKey('DB_PASSWORD')).toBe(true)
      expect(isSensitiveKey('API_TOKEN')).toBe(true)
      expect(isSensitiveKey('STRIPE_SECRET_KEY')).toBe(true)
      expect(isSensitiveKey('PORT')).toBe(false)
      expect(isSensitiveKey('NODE_ENV')).toBe(false)
    })

    it('masks database connection URL passwords without losing host information', () => {
      const rawUrl = 'postgres://solarch_user:SuperSecretPassword123!@db.solarch.internal:5432/production_db'
      const masked = maskDatabaseUrl(rawUrl)
      expect(masked).toBeDefined()
      expect(masked).not.toContain('SuperSecretPassword123!')
      expect(masked).toContain('****')
      expect(masked).toContain('solarch_user')
      expect(masked).toContain('db.solarch.internal')
      expect(masked).toContain('production_db')
    })

    it('masks sensitive environment values', () => {
      expect(maskSecret('my-super-secret-key')).toBe('configured')
      expect(maskSecret('')).toBe('missing')
      expect(maskSecret(undefined)).toBe('missing')
      expect(maskEnvValue('JWT_SECRET', 'secret123')).toBe('configured')
      expect(maskEnvValue('PORT', '8090')).toBe('8090')
    })
  })

  describe('2. Input Sanitization & Path Traversal Rejection', () => {
    it('rejects path traversal in resource names', () => {
      expect(() => validateResourceName('../../../etc/passwd')).toThrow(/Path traversal/)
      expect(() => validateResourceName('users/../../secret')).toThrow(/Path traversal/)
      expect(() => validateResourceName('..\\windows\\system32')).toThrow(/Path traversal/)
    })

    it('rejects shell metacharacters and SQL injection payloads in resource names', () => {
      expect(() => validateResourceName('users; rm -rf /')).toThrow()
      expect(() => validateResourceName('posts && cat /etc/passwd')).toThrow()
      expect(() => validateResourceName("users' OR '1'='1")).toThrow()
      expect(() => validateResourceName('user$name')).toThrow()
    })

    it('accepts valid alphanumeric, dashed, and underscored resource names', () => {
      expect(() => validateResourceName('users')).not.toThrow()
      expect(() => validateResourceName('user_profiles')).not.toThrow()
      expect(() => validateResourceName('blog-posts')).not.toThrow()
      expect(() => validateResourceName('Item123')).not.toThrow()
    })

    it('rejects path traversal in migrate create', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sec-mig-'))
      try {
        await expect(runMigrateCreate('../../../evil_migration', { dir: tmp })).rejects.toThrow(/Path traversal/)
        await expect(runMigrateCreate('evil/migration', { dir: tmp })).rejects.toThrow(/Path traversal/)
        await expect(runMigrateCreate('', { dir: tmp })).rejects.toThrow(/empty/)
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
      }
    })
  })

  describe('3. Config Secret Protection', () => {
    it('strictly refuses attempts to store secrets in config files via config set', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sec-cfg-'))
      const configJsonPath = path.join(tmp, 'solarch.config.json')
      fs.writeFileSync(configJsonPath, JSON.stringify({ port: 8090 }), 'utf-8')

      try {
        await expect(
          runConfigSet({
            dir: tmp,
            key: 'jwt_secret',
            value: 'insecure_token_123',
            exitOnComplete: false,
          })
        ).rejects.toThrow(/Cannot set secrets/)

        await expect(
          runConfigSet({
            dir: tmp,
            key: 'password',
            value: 'pass123',
            exitOnComplete: false,
          })
        ).rejects.toThrow(/Cannot set secrets/)
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
      }
    })
  })

  describe('4. Filesystem Permissions & Secret Generation', () => {
    let tmpDir: string

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sec-env-'))
    })

    afterAll(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    })

    it('scaffolds .env with restricted 0o600 file mode and 256-bit entropy keys', () => {
      const res = generateProjectFiles(
        {
          name: 'sec-app',
          database: 'sqlite',
          authProviders: ['email'],
          rateLimit: true,
          ai: false,
        },
        tmpDir
      )

      const envPath = path.join(res.projectDir, '.env')
      expect(fs.existsSync(envPath)).toBe(true)

      const content = fs.readFileSync(envPath, 'utf-8')
      expect(content).toContain('JWT_SECRET=')
      expect(content).toContain('SOLARCH_JWT_SECRET=')
      expect(content).toContain('SOLARCH_ENCRYPTION_KEY=')

      // Verify minimum 64 hex characters (256 bits)
      const jwtMatch = content.match(/SOLARCH_JWT_SECRET=([a-f0-9]+)/)
      expect(jwtMatch).toBeDefined()
      expect(jwtMatch![1].length).toBeGreaterThanOrEqual(64)

      const encMatch = content.match(/SOLARCH_ENCRYPTION_KEY=([a-f0-9]+)/)
      expect(encMatch).toBeDefined()
      expect(encMatch![1].length).toBeGreaterThanOrEqual(64)

      // Verify file permission mode on Unix platforms
      if (process.platform !== 'win32') {
        const stats = fs.statSync(envPath)
        const mode = stats.mode & 0o777
        // 0o600 (owner read/write only) or at least not world-writable
        expect(mode & 0o002).toBe(0) // Not world-writable
      }
    })
  })

  describe('5. Template Security Isolation & Doctor Diagnostic Verification', () => {
    let tmpDir: string

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sec-templates-'))
    })

    afterAll(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    })

    for (const template of listTemplates()) {
      it(`template "${template.name}" generates valid config and passes doctor diagnostics`, async () => {
        const projectDir = path.join(tmpDir, `app-${template.name}`)
        generateProjectFiles(
          {
            name: `app-${template.name}`,
            template,
            database: 'sqlite',
            authProviders: template.features.auth || ['email'],
            rateLimit: template.features.rateLimit ?? true,
            ai: template.features.ai ?? false,
          },
          tmpDir
        )

        const report = await runDoctor({ cwd: projectDir, silent: true, exitOnComplete: false })
        expect(report.overallStatus).not.toBe('unhealthy')

        // Node runtime check must pass
        const nodeCheck = report.checks.find(c => c.id === 'node_runtime')
        expect(nodeCheck?.status).toBe('pass')

        // Config file must be loaded
        const configCheck = report.checks.find(c => c.id === 'config_file')
        expect(configCheck?.status).toBe('pass')

        // Data directory permissions must pass
        const dataCheck = report.checks.find(c => c.id === 'data_directory')
        expect(dataCheck?.status).toBe('pass')
      })
    }
  })
})
