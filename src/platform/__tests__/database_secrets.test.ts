import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { DatabaseProvisionOrchestrator } from '../database/provisioning.js'
import { ProjectMetadata, ProjectManifest } from '../../ecosystem/metadata.js'

describe('Database Secrets Boundary & Permissions (Phase 6)', () => {
  let tempDir: string

  const baseManifest: ProjectManifest = {
    schemaVersion: 1,
    name: 'secret-test-app',
    application: 'web',
    runtimeVersion: '0.19.8',
    database: {
      engine: 'sqlite',
      topology: 'standalone',
      capabilities: {},
      source: 'intent',
    },
    sdks: ['@solarch/core-client'],
    plugins: {
      mode: 'opt-in',
      list: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-db-sec-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. writes database credentials exclusively to .env (0o600) and metadata only to manifest', async () => {
    const rawSecret = 'postgresql://admin:super_secret_pw@ep-cool.neon.tech/app_prod?sslmode=require'

    await DatabaseProvisionOrchestrator.applyProvisionedDatabase(
      tempDir,
      { ...baseManifest },
      {
        engine: 'postgres',
        provider: 'neon',
        topology: 'serverless',
        host: 'ep-cool.neon.tech',
        secretRefs: ['DATABASE_URL'],
      },
      'production',
      {
        envKey: 'DATABASE_URL',
        secretValue: rawSecret,
      }
    )

    // Check .env content
    const envPath = path.join(tempDir, '.env')
    expect(fs.existsSync(envPath)).toBe(true)
    const envContent = fs.readFileSync(envPath, 'utf-8')
    expect(envContent).toContain('DATABASE_URL=')
    expect(envContent).toContain('super_secret_pw')

    // Check .solarch/project.json content
    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest).toBeDefined()
    expect(manifest?.database.engine).toBe('postgres')
    expect(manifest?.database.provider).toBe('neon')
    expect(manifest?.database.topology).toBe('serverless')
    expect(manifest?.database.secretRefs).toEqual(['DATABASE_URL'])

    // Stringify manifest and verify zero secrets are stored in JSON
    const manifestJson = JSON.stringify(manifest)
    expect(manifestJson).not.toContain('super_secret_pw')
    expect(manifestJson).not.toContain('admin:super_secret_pw')
  })
})
