import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  runInit,
  validateProjectName,
  validateDatabase,
  validateDatabaseUrl,
  validateAuthProviders,
  parseBoolean,
} from '../init'
import { Solarch } from '../../solarch'

describe('CLI Init Command (Hardening & Scaffolding)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-init-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
  })

  it('scaffolds default SQLite project non-interactively with --yes', async () => {
    await runInit({
      yes: true,
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'my-app')
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_data'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_init.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'solarch.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)
    // Invariant: SQLite default does not generate docker-compose.yml
    expect(fs.existsSync(path.join(projectDir, 'docker-compose.yml'))).toBe(false)

    // Verify .env contents and cryptographic secrets
    const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
    const jwtMatch = envContent.match(/JWT_SECRET=([a-f0-9]+)/)
    const encMatch = envContent.match(/SOLARCH_ENCRYPTION_KEY=([a-f0-9]+)/)

    expect(jwtMatch).not.toBeNull()
    expect(jwtMatch![1].length).toBe(64) // 32 bytes hex = 64 characters

    expect(encMatch).not.toBeNull()
    expect(encMatch![1].length).toBe(64)

    // Verify solarch.config.ts contents
    const configContent = fs.readFileSync(path.join(projectDir, 'solarch.config.ts'), 'utf-8')
    expect(configContent).toContain("database: { type: 'sqlite' }")
    expect(configContent).toContain("auth: { providers: ['email'] }")
    expect(configContent).toContain("rateLimiting: { enabled: true }")
    expect(configContent).toContain("ai: { enabled: false }")
  })

  it('scaffolds project with custom name and directory', async () => {
    const customName = 'custom-service-api'
    await runInit({
      yes: true,
      dir: tempBaseDir,
      name: customName,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, customName)
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)
  })

  it('scaffolds PostgreSQL project with connection string and docker-compose.yml', async () => {
    const pgUrl = 'postgres://postgres:secret123@localhost:5432/myapp_db'
    await runInit({
      yes: true,
      dir: tempBaseDir,
      name: 'pg-app',
      db: 'postgres',
      dbUrl: pgUrl,
      auth: 'email,google,github',
      rateLimit: 'false',
      ai: 'true',
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'pg-app')
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'docker-compose.yml'))).toBe(true)

    const dcContent = fs.readFileSync(path.join(projectDir, 'docker-compose.yml'), 'utf-8')
    expect(dcContent).toContain('POSTGRES_DB: pg-app')

    const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
    expect(envContent).toContain(`DATABASE_URL=${pgUrl}`)
    expect(envContent).toContain('GOOGLE_CLIENT_ID=')
    expect(envContent).toContain('GITHUB_CLIENT_ID=')

    const configContent = fs.readFileSync(path.join(projectDir, 'solarch.config.ts'), 'utf-8')
    expect(configContent).toContain("database: { type: 'postgres' }")
    expect(configContent).not.toContain(pgUrl)
    expect(configContent).toContain("auth: { providers: ['email', 'google', 'github'] }")
    expect(configContent).toContain('rateLimiting: { enabled: false }')
    expect(configContent).toContain('ai: { enabled: true }')
  })

  it('scaffolds PostgreSQL project cleanly without a DATABASE_URL in non-interactive mode', async () => {
    await runInit({
      yes: true,
      dir: tempBaseDir,
      name: 'pg-local-app',
      db: 'postgres',
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'pg-local-app')
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'docker-compose.yml'))).toBe(true)
    const configContent = fs.readFileSync(path.join(projectDir, 'solarch.config.ts'), 'utf-8')
    expect(configContent).toContain("database: { type: 'postgres' }")
  })

  it('fails fast when PostgreSQL DATABASE_URL has invalid protocol shape', async () => {
    await expect(
      runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'fail-pg-shape',
        db: 'postgres',
        dbUrl: 'http://localhost:5432/mydb',
        exitOnComplete: false,
      })
    ).rejects.toThrow(/Invalid PostgreSQL DATABASE_URL/)

    expect(fs.existsSync(path.join(tempBaseDir, 'fail-pg-shape'))).toBe(false)
  })

  it('rejects invalid project names and path traversal attempts', async () => {
    const invalidNames = ['../outside', '/root/bad', 'a/b', 'test\\back', '..', '.', 'bad name with spaces!', '']

    for (const name of invalidNames) {
      await expect(
        runInit({
          yes: true,
          dir: tempBaseDir,
          name,
          exitOnComplete: false,
        })
      ).rejects.toThrow()
    }
  })

  it('rejects unsupported database providers', async () => {
    await expect(
      runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'bad-db-app',
        db: 'mysql',
        exitOnComplete: false,
      })
    ).rejects.toThrow(/Invalid database provider "mysql"/)
  })

  it('rejects unsupported auth providers', async () => {
    await expect(
      runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'bad-auth-app',
        auth: 'email,twitter',
        exitOnComplete: false,
      })
    ).rejects.toThrow(/Invalid auth provider "twitter"/)
  })

  it('rejects invalid boolean flag values', async () => {
    await expect(
      runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'bad-bool-app',
        rateLimit: 'maybe',
        exitOnComplete: false,
      })
    ).rejects.toThrow(/Invalid value for --rate-limit/)
  })

  it('prevents collision when target directory already exists and is not empty', async () => {
    const targetDir = path.join(tempBaseDir, 'existing-app')
    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(path.join(targetDir, 'pre-existing-file.txt'), 'do not touch')

    await expect(
      runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'existing-app',
        exitOnComplete: false,
      })
    ).rejects.toThrow(/already exists and is not empty\. Use --force to overwrite\./)

    // Pre-existing file remains intact
    expect(fs.readFileSync(path.join(targetDir, 'pre-existing-file.txt'), 'utf-8')).toBe('do not touch')
  })

  it('allows overwrite when --force is specified', async () => {
    const targetDir = path.join(tempBaseDir, 'forced-app')
    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(path.join(targetDir, 'old-file.txt'), 'old')

    await runInit({
      yes: true,
      dir: tempBaseDir,
      name: 'forced-app',
      force: true,
      exitOnComplete: false,
    })

    expect(fs.existsSync(path.join(targetDir, '.env'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'solarch.config.ts'))).toBe(true)
  })

  it('generated project configuration is fully compatible with Solarch engine boot and dotenv loading', async () => {
    const origJwtSecret = process.env.JWT_SECRET
    const origSolarchJwtSecret = process.env.SOLARCH_JWT_SECRET
    try {
      delete process.env.JWT_SECRET
      delete process.env.SOLARCH_JWT_SECRET

      await runInit({
        yes: true,
        dir: tempBaseDir,
        name: 'boot-test-app',
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'boot-test-app')
      const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
      
      expect(envContent).toMatch(/^JWT_SECRET=[a-f0-9]{64}$/m)
      expect(envContent).toMatch(/^SOLARCH_JWT_SECRET=[a-f0-9]{64}$/m)

      // Simulate dotenv loading when entering the generated project directory
      const dotenv = require('dotenv')
      const parsed = dotenv.parse(envContent)
      for (const [k, v] of Object.entries(parsed)) {
        process.env[k] = v as string
      }

      const app = new Solarch({
        hideStartBanner: true,
        defaultDev: false,
        defaultDataDir: path.join(projectDir, 'pb_data'),
        dbProvider: 'sqlite',
      })

      await app.bootstrap()
      expect(app.isBootstrapped()).toBe(true)
      expect(app.getJwtSecret()).toBe(parsed.JWT_SECRET)
      expect(app.getJwtSecretSafe()).toBe(parsed.JWT_SECRET)
      expect(fs.existsSync(path.join(projectDir, 'pb_data', 'data.db'))).toBe(true)

      await app.db().close()
    } finally {
      if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret
      else delete process.env.JWT_SECRET
      if (origSolarchJwtSecret) process.env.SOLARCH_JWT_SECRET = origSolarchJwtSecret
      else delete process.env.SOLARCH_JWT_SECRET
    }
  })

  it('generates files when review step is accepted in interactive flow', async () => {
    const initPromptModule = await import('../../ui/prompts/init')
    const reviewPromptModule = await import('../../ui/prompts/review')

    const origIsTTY = process.stdin.isTTY
    const origCI = process.env.CI
    try {
      process.stdin.isTTY = true
      delete process.env.CI

      const initSpy = vi.spyOn(initPromptModule, 'promptInit').mockResolvedValueOnce({
        name: 'reviewed-app',
        database: 'sqlite',
        authProviders: ['email'],
        rateLimit: true,
        ai: false,
        dir: tempBaseDir,
      })

      const reviewSpy = vi.spyOn(reviewPromptModule, 'promptReview').mockResolvedValueOnce(true)

      await runInit({
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      expect(initSpy).toHaveBeenCalled()
      expect(reviewSpy).toHaveBeenCalled()
      expect(fs.existsSync(path.join(tempBaseDir, 'reviewed-app', 'solarch.config.ts'))).toBe(true)
    } finally {
      process.stdin.isTTY = origIsTTY
      if (origCI !== undefined) process.env.CI = origCI
    }
  })

  it('cancels file generation without creating project when review is rejected', async () => {
    const initPromptModule = await import('../../ui/prompts/init')
    const reviewPromptModule = await import('../../ui/prompts/review')

    const origIsTTY = process.stdin.isTTY
    const origCI = process.env.CI
    try {
      process.stdin.isTTY = true
      delete process.env.CI

      const initSpy = vi.spyOn(initPromptModule, 'promptInit').mockResolvedValueOnce({
        name: 'cancelled-app',
        database: 'sqlite',
        authProviders: ['email'],
        rateLimit: true,
        ai: false,
        dir: tempBaseDir,
      })

      const reviewSpy = vi.spyOn(reviewPromptModule, 'promptReview').mockResolvedValueOnce(false)

      await runInit({
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      expect(initSpy).toHaveBeenCalled()
      expect(reviewSpy).toHaveBeenCalled()
      expect(fs.existsSync(path.join(tempBaseDir, 'cancelled-app'))).toBe(false)
    } finally {
      process.stdin.isTTY = origIsTTY
      if (origCI !== undefined) process.env.CI = origCI
    }
  })

  it('invokes all 4 spinner lifecycle hooks in order during file generation', async () => {
    const { generateProjectFiles } = await import('../init/generator')
    const events: string[] = []

    const hooks = {
      onFoldersStart: () => events.push('foldersStart'),
      onFoldersEnd: () => events.push('foldersEnd'),
      onSecretsStart: () => events.push('secretsStart'),
      onSecretsEnd: () => events.push('secretsEnd'),
      onConfigStart: () => events.push('configStart'),
      onConfigEnd: () => events.push('configEnd'),
      onValidationStart: () => events.push('validationStart'),
      onValidationEnd: () => events.push('validationEnd'),
    }

    generateProjectFiles(
      {
        name: 'spinner-order-app',
        database: 'sqlite',
        authProviders: ['email'],
        rateLimit: true,
        ai: false,
        dir: tempBaseDir,
      },
      tempBaseDir,
      hooks
    )

    expect(events).toEqual([
      'foldersStart',
      'foldersEnd',
      'secretsStart',
      'secretsEnd',
      'configStart',
      'configEnd',
      'validationStart',
      'validationEnd',
    ])
  })

  it('stops spinner with failure when error occurs during generation in runInit', async () => {
    const uiModule = await import('../../ui')
    const stopSpy = vi.fn()
    const startSpy = vi.fn()
    vi.spyOn(uiModule, 'spinner').mockReturnValue({
      start: startSpy,
      stop: stopSpy,
      message: vi.fn(),
    } as any)

    // Pre-create non-empty directory to trigger collision error without --force
    const collisionDir = path.join(tempBaseDir, 'collision-app')
    fs.mkdirSync(collisionDir)
    fs.writeFileSync(path.join(collisionDir, 'some-file.txt'), 'content')

    await expect(
      runInit({
        yes: true,
        name: 'collision-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })
    ).rejects.toThrow(/already exists and is not empty/)

    expect(stopSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed:')
    )
  })

  it('successfully passes doctor validation on valid generated project', async () => {
    const doctorModule = await import('../doctor')
    const doctorSpy = vi.spyOn(doctorModule, 'runDoctor')

    await runInit({
      yes: true,
      name: 'doctor-valid-app',
      dir: tempBaseDir,
      exitOnComplete: false,
    })

    expect(doctorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: path.join(tempBaseDir, 'doctor-valid-app'),
        silent: true,
        exitOnComplete: false,
      })
    )
    expect(fs.existsSync(path.join(tempBaseDir, 'doctor-valid-app', 'pb_data'))).toBe(true)
  })

  it('fails init when doctor validation detects a fatal check failure', async () => {
    const doctorModule = await import('../doctor')
    vi.spyOn(doctorModule, 'runDoctor').mockResolvedValueOnce({
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: 'darwin',
      cwd: path.join(tempBaseDir, 'doctor-fail-app'),
      overallStatus: 'unhealthy',
      checks: [
        {
          id: 'database_connectivity',
          name: 'Database Connectivity',
          status: 'fail',
          message: 'Connection refused on host localhost:5432',
        },
      ],
    })

    await expect(
      runInit({
        yes: true,
        name: 'doctor-fail-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })
    ).rejects.toThrow(/Project generation failed validation/)
  })
})
