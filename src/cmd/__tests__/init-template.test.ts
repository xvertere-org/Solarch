import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init/index.js'

describe('Init Experience 2.0 & Template Scaffolding', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-init2-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. scaffolds minimal template and passes validation', async () => {
    const result: any = await runInit({
      name: 'test-minimal',
      template: 'minimal',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result.projectName).toBe('test-minimal')
    const projectDir = path.join(tempDir, 'test-minimal')

    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'solarch.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_init.js'))).toBe(true)
  })

  it('2. scaffolds api template with users and posts migrations', async () => {
    const result: any = await runInit({
      name: 'test-api',
      template: 'api',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result.projectName).toBe('test-api')
    const projectDir = path.join(tempDir, 'test-api')

    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_create_users.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '002_create_posts.js'))).toBe(true)

    const cfg = fs.readFileSync(path.join(projectDir, 'solarch.config.ts'), 'utf-8')
    expect(cfg).toContain("rateLimiting: { enabled: true }")
  })

  it('3. scaffolds realtime template with event models and hook', async () => {
    const result: any = await runInit({
      name: 'test-realtime',
      template: 'realtime',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempDir, 'test-realtime')
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_create_events.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src', 'hooks', 'realtime.ts'))).toBe(true)
  })

  it('4. scaffolds saas template with multi-tenancy, audit logs, and billing hook', async () => {
    const result: any = await runInit({
      name: 'test-saas',
      template: 'saas',
      db: 'sqlite',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempDir, 'test-saas')
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_create_users.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '002_create_organizations.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '003_create_audit_logs.js'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src', 'hooks', 'billing.ts'))).toBe(true)

    const env = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
    expect(env).toContain('STRIPE_SECRET_KEY=')
    expect(env).toContain('GOOGLE_CLIENT_ID=')
    expect(env).toContain('GITHUB_CLIENT_ID=')
  })

  it('5. scaffolds ai template with vectors collection', async () => {
    const result: any = await runInit({
      name: 'test-ai',
      template: 'ai',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    const projectDir = path.join(tempDir, 'test-ai')
    expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_create_vectors.js'))).toBe(true)

    const env = fs.readFileSync(path.join(projectDir, '.env'), 'utf-8')
    expect(env).toContain('OPENAI_API_KEY=')
  })

  it('6. applies preset configuration shortcuts', async () => {
    const result: any = await runInit({
      name: 'test-preset-prod',
      preset: 'production',
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result.database).toBe('postgres')
    const projectDir = path.join(tempDir, 'test-preset-prod')
    expect(fs.existsSync(path.join(projectDir, 'docker-compose.yml'))).toBe(true)
  })

  it('7. previews scaffolding plan in --dry-run mode without creating files', async () => {
    const result: any = await runInit({
      name: 'test-dry-run',
      template: 'saas',
      dryRun: true,
      dir: tempDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result.dryRun).toBe(true)
    expect(result.filesCreated).toContain('solarch.config.ts')
    expect(result.filesCreated).toContain('src/hooks/billing.ts')
    expect(result.filesCreated).toContain('pb_migrations/001_create_users.js')

    const projectDir = path.join(tempDir, 'test-dry-run')
    expect(fs.existsSync(projectDir)).toBe(false)
  })

  it('8. rejects unknown template and preset cleanly', async () => {
    await expect(
      runInit({
        name: 'test-bad-tpl',
        template: 'non-existent-template',
        dir: tempDir,
        yes: true,
        exitOnComplete: false,
      })
    ).rejects.toThrow('Unknown template')

    await expect(
      runInit({
        name: 'test-bad-preset',
        preset: 'non-existent-preset',
        dir: tempDir,
        yes: true,
        exitOnComplete: false,
      })
    ).rejects.toThrow('Unknown preset')
  })
})
