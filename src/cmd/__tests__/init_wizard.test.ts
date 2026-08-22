import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init/index.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { RecommendationEngine } from '../../ecosystem/recommendation.js'
import { ProjectIntent } from '../../ecosystem/intent.js'

describe('Ecosystem-Aware Init Wizard (Phase 1)', () => {
  let testBaseDir: string

  beforeEach(async () => {
    testBaseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-init-test-'))
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. Web Application: creates project with solarch-web SDK and valid manifest', async () => {
    const result = await runInit({
      name: 'web-app',
      app: 'web',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    expect(result.projectName).toBe('web-app')
    expect(result.database).toBe('sqlite')
    expect(result.filesCreated).toContain('.solarch/project.json')
    expect(result.filesCreated).toContain('solarch.config.ts')
    expect(result.filesCreated).toContain('.env')

    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest).toBeDefined()
    expect(manifest?.application).toBe('web')
    expect(manifest?.sdks).toContain('solarch-web')
    expect(manifest?.database.engine).toBe('sqlite')
  })

  it('2. AI Application: recommends PostgreSQL + pgvector and solarch-ai', async () => {
    const result = await runInit({
      name: 'ai-app',
      app: 'ai',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    expect(result.database).toBe('postgres')
    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.application).toBe('ai')
    expect(manifest?.database.engine).toBe('postgres')
    expect(manifest?.database.capabilities.vector).toBe(true)
    expect(manifest?.sdks).toContain('solarch-ai')
  })

  it('3. Agent Application: recommends PostgreSQL with pgvector capability', async () => {
    const result = await runInit({
      name: 'agent-app',
      app: 'agent',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.application).toBe('agent')
    expect(manifest?.database.capabilities.vector).toBe(true)
    expect(manifest?.sdks).toContain('solarch-ai')
  })

  it('4. Local + Cloud Hybrid: sets sqlite_local_postgres_cloud topology', async () => {
    const result = await runInit({
      name: 'hybrid-app',
      app: 'api',
      deployment: 'local_and_cloud',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.database.topology).toBe('sqlite_local_postgres_cloud')
  })

  it('5. Explicit MongoDB Selection: overrides AI PostgreSQL recommendation', async () => {
    const result = await runInit({
      name: 'mongo-ai-app',
      app: 'ai',
      db: 'mongodb',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    expect(result.database).toBe('mongodb')
    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.database.engine).toBe('mongodb')
    expect(manifest?.database.topology).toBe('mongodb_only')
  })

  it('6. Mobile Application: recommends solarch-rn SDK', async () => {
    const result = await runInit({
      name: 'mobile-app',
      app: 'mobile',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.application).toBe('mobile')
    expect(manifest?.sdks).toContain('solarch-rn')
  })

  it('7. Desktop Application: preserves Electron or Tauri runtime choices', async () => {
    const resultElectron = await runInit({
      name: 'desktop-electron-app',
      app: 'desktop',
      desktopRuntime: 'electron',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })
    expect(resultElectron).toBeDefined()
    const manifestElectron = await ProjectMetadata.readManifest(resultElectron!.projectDir)
    expect(manifestElectron?.desktop?.runtime).toBe('electron')
    expect(manifestElectron?.sdks).toContain('solarch-electron')

    const resultTauri = await runInit({
      name: 'desktop-tauri-app',
      app: 'desktop',
      desktopRuntime: 'tauri',
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })
    expect(resultTauri).toBeDefined()
    const manifestTauri = await ProjectMetadata.readManifest(resultTauri!.projectDir)
    expect(manifestTauri?.desktop?.runtime).toBe('tauri')
    expect(manifestTauri?.sdks).toContain('solarch-tauri')
  })

  it('8. Plugin Selection: records plugin intent in manifest without credentials', async () => {
    const result = await runInit({
      name: 'plugins-app',
      app: 'saas',
      plugins: ['stripe', 'resend'],
      dir: testBaseDir,
      yes: true,
      exitOnComplete: false,
    })

    expect(result).toBeDefined()
    if (!result) return

    const manifest = await ProjectMetadata.readManifest(result.projectDir)
    expect(manifest?.plugins.mode).toBe('selected')
    expect(manifest?.plugins.list).toEqual(['stripe', 'resend'])

    // Assert zero secret leakage in manifest
    const rawManifest = await fs.promises.readFile(
      path.join(result.projectDir, '.solarch', 'project.json'),
      'utf-8'
    )
    expect(rawManifest).not.toContain('secret')
    expect(rawManifest).not.toContain('password')
    expect(rawManifest).not.toContain('api_key')
  })

  it('9. Directory collision safety: refuses to overwrite non-empty directory without --force', async () => {
    const projectDir = path.join(testBaseDir, 'existing-app')
    await fs.promises.mkdir(projectDir, { recursive: true })
    await fs.promises.writeFile(path.join(projectDir, 'existing.txt'), 'content')

    await expect(
      runInit({
        name: 'existing-app',
        dir: testBaseDir,
        yes: true,
        exitOnComplete: false,
      })
    ).rejects.toThrow(/already exists and is not empty/)

    // Succeeds with --force
    const forced = await runInit({
      name: 'existing-app',
      dir: testBaseDir,
      force: true,
      yes: true,
      exitOnComplete: false,
    })
    expect(forced).toBeDefined()
  })

  it('10. Dry run mode compiles plan and manifest without modifying disk', async () => {
    const dryRunResult = await runInit({
      name: 'dryrun-app',
      app: 'ai',
      dir: testBaseDir,
      dryRun: true,
      exitOnComplete: false,
    })

    expect(dryRunResult).toBeDefined()
    expect(dryRunResult?.dryRun).toBe(true)
    expect(dryRunResult?.filesCreated).toContain('.solarch/project.json')

    const exists = fs.existsSync(path.join(testBaseDir, 'dryrun-app'))
    expect(exists).toBe(false)
  })
})
