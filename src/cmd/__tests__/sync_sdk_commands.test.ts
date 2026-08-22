import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runSync } from '../sync.js'
import { runSdkList } from '../sdk/list.js'
import { runSdkAdd } from '../sdk/add.js'
import { runSdkRemove } from '../sdk/remove.js'
import { runSdkSync } from '../sdk/sync.js'
import { SyncService } from '../../platform/sync/sync-service.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { SessionStore } from '../../platform/auth/session-store.js'
import { PlatformConfig } from '../../platform/config.js'
import { PackageManagerDetector } from '../../platform/sdk/package-manager.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('Sync & SDK CLI Commands (Phase 3)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore
  let config: PlatformConfig
  let authService: AuthService
  let syncService: SyncService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cmd-sync-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    sessionStore = new SessionStore(configDir)
    config = new PlatformConfig({ apiBaseUrl: 'https://mock.api.solarch.in' })
    authService = new AuthService(config, sessionStore)
    syncService = new SyncService(config, authService)

    // Write package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        dependencies: {
          '@solarch/core-client': '^0.19.8',
        },
      }),
      'utf-8'
    )

    // Write baseline linked manifest
    const plan = RecommendationEngine.createPlan(
      { name: 'test-app', dir: tempDir },
      new ProjectIntent({
        application: 'web',
        deployment: 'local',
        explicitChoices: {
          sdks: ['@solarch/core-client'],
        },
      })
    )
    const manifest = ProjectMetadata.fromPlan(plan)
    manifest.platform = {
      projectId: 'prj-test-sync',
      orgId: 'org-test',
      linkedAt: new Date().toISOString(),
    }
    await ProjectMetadata.writeManifest(tempDir, manifest)

    await sessionStore.saveCredentials({ accessToken: 'valid-cli-sync-token' })
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. solarch sync --json executes and outputs machine-readable report', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/v1/projects/prj-test-sync/config')) {
        return new Response(
          JSON.stringify({
            projectId: 'prj-test-sync',
            orgId: 'org-test',
            name: 'test-app',
            environment: 'development',
            envVars: {
              SYNCED_API_KEY: 'secret-val-999',
            },
            requiredSdks: ['solarch-web'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await runSync({
      dir: tempDir,
      json: true,
      syncService,
    })

    expect(result.projectId).toBe('prj-test-sync')
    expect(result.envChanges.added).toContain('SYNCED_API_KEY')
    expect(result.missingSdks).toContain('solarch-web')

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.projectId).toBe('prj-test-sync')
    expect(parsed.envChanges.added).toContain('SYNCED_API_KEY')

    logSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('2. solarch sdk list --json outputs structured catalog status', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runSdkList({
      dir: tempDir,
      json: true,
    })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(Array.isArray(parsed)).toBe(true)

    const webSdk = parsed.find((s: any) => s.name === 'solarch-web')
    expect(webSdk).toBeDefined()

    logSpy.mockRestore()
  })

  it('3. solarch sdk add installs package and updates manifest', async () => {
    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('OK')

    await runSdkAdd({
      packages: ['solarch-ai'],
      dir: tempDir,
    })

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).toContain('solarch-ai')

    execSpy.mockRestore()
  })

  it('4. solarch sdk remove uninstalls package and updates manifest', async () => {
    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('OK')

    await runSdkRemove({
      packages: ['solarch-web'],
      dir: tempDir,
    })

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).not.toContain('solarch-web')

    execSpy.mockRestore()
  })

  it('5. solarch sdk sync reconciles missing packages with --yes', async () => {
    // Add solarch-ai to manifest but not installed in package.json
    const manifest = await ProjectMetadata.readManifest(tempDir)
    if (manifest) {
      manifest.sdks = ['solarch-ai']
      await ProjectMetadata.writeManifest(tempDir, manifest)
    }

    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('Installed OK')

    await runSdkSync({
      dir: tempDir,
      yes: true,
    })

    expect(execSpy).toHaveBeenCalled()
    expect(execSpy.mock.calls[0][0]).toContain('solarch-ai')

    execSpy.mockRestore()
  })
})
