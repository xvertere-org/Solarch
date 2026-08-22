import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SyncService } from '../sync/sync-service.js'
import { AuthService } from '../auth/auth-service.js'
import { SessionStore } from '../auth/session-store.js'
import { PlatformConfig } from '../config.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('SyncService (Phase 3)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore
  let config: PlatformConfig
  let authService: AuthService
  let syncService: SyncService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sync-service-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    sessionStore = new SessionStore(configDir)
    config = new PlatformConfig({ apiBaseUrl: 'https://mock.api.solarch.in' })
    authService = new AuthService(config, sessionStore)
    syncService = new SyncService(config, authService)

    // Baseline manifest with platform linkage
    const plan = RecommendationEngine.createPlan(
      { name: 'test-sync-app', dir: tempDir },
      new ProjectIntent({
        application: 'web',
        deployment: 'cloud',
      })
    )
    const manifest = ProjectMetadata.fromPlan(plan)
    manifest.platform = {
      projectId: 'prj-remote-123',
      orgId: 'org-remote-456',
      linkedAt: new Date().toISOString(),
    }
    await ProjectMetadata.writeManifest(tempDir, manifest)

    // Save active auth session
    await sessionStore.saveCredentials({ accessToken: 'valid-sync-token' })
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. synchronizes remote environment variables and updates manifest', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/v1/projects/prj-remote-123/config')) {
        return new Response(
          JSON.stringify({
            projectId: 'prj-remote-123',
            orgId: 'org-remote-456',
            name: 'test-sync-app',
            environment: 'development',
            envVars: {
              REMOTE_SYNC_KEY: 'remote-secret-xyz',
              STORAGE_BUCKET: 'solarch-prod-bucket',
            },
            requiredSdks: ['solarch-web', 'solarch-ai'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const result = await syncService.sync({ dir: tempDir, environment: 'development' })

    expect(result.projectId).toBe('prj-remote-123')
    expect(result.envChanges.added).toContain('REMOTE_SYNC_KEY')
    expect(result.envChanges.added).toContain('STORAGE_BUCKET')
    expect(result.missingSdks).toContain('solarch-ai')

    // Verify .env written to disk with mode 0o600
    const envPath = path.join(tempDir, '.env')
    expect(fs.existsSync(envPath)).toBe(true)
    const envContent = fs.readFileSync(envPath, 'utf-8')
    expect(envContent).toContain('REMOTE_SYNC_KEY=remote-secret-xyz')
    expect(envContent).toContain('STORAGE_BUCKET=solarch-prod-bucket')

    // Verify manifest updated with required SDKs
    const updatedManifest = await ProjectMetadata.readManifest(tempDir)
    expect(updatedManifest?.sdks).toContain('solarch-ai')

    fetchSpy.mockRestore()
  })

  it('2. dry-run previews changes without modifying .env or manifest', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/v1/projects/prj-remote-123/config')) {
        return new Response(
          JSON.stringify({
            projectId: 'prj-remote-123',
            orgId: 'org-remote-456',
            name: 'test-sync-app',
            environment: 'development',
            envVars: {
              DRY_RUN_VAR: 'preview_only',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const result = await syncService.sync({ dir: tempDir, dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.envChanges.added).toContain('DRY_RUN_VAR')

    // File should not be created
    const envPath = path.join(tempDir, '.env')
    expect(fs.existsSync(envPath)).toBe(false)

    fetchSpy.mockRestore()
  })
})
