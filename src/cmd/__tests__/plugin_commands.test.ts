import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runPluginList } from '../plugin/list.js'
import { runPluginInfo } from '../plugin/info.js'
import { runPluginAdd } from '../plugin/add.js'
import { runPluginRemove } from '../plugin/remove.js'
import { runPluginEnable, runPluginDisable } from '../plugin/enable.js'
import { runPluginSync } from '../plugin/sync.js'
import { SessionStore } from '../../platform/auth/session-store.js'
import { PlatformProjectConfig } from '../../platform/schema/project-config.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('Plugin CLI Commands (Phase 5)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore

  const mockRemoteConfig: PlatformProjectConfig = {
    schemaVersion: '1.0.0',
    configVersion: 1,
    projectId: 'prj-plug-123',
    orgId: 'org-plug-456',
    name: 'plugin-test-app',
    capabilities: {},
    database: { engine: 'sqlite', provider: 'local', features: { vector: false } },
    sdkRequirements: [],
    pluginRequirements: [
      { name: '@solarch/plugin-auth-oauth' },
      { name: '@solarch/plugin-billing-stripe' },
    ],
    environments: {},
    updatedAt: new Date().toISOString(),
  }

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cmd-plugin-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    process.env.SOLARCH_CONFIG_DIR = configDir
    sessionStore = new SessionStore(configDir)

    await sessionStore.saveCredentials({ accessToken: 'valid-plugin-token' })

    const plan = RecommendationEngine.createPlan(
      { name: 'plugin-test-app', dir: tempDir },
      new ProjectIntent({ application: 'web', deployment: 'local' })
    )
    const manifest = ProjectMetadata.fromPlan(plan)
    manifest.platform = {
      projectId: 'prj-plug-123',
      orgId: 'org-plug-456',
      linkedAt: new Date().toISOString(),
    }
    await ProjectMetadata.writeManifest(tempDir, manifest)
  })

  afterEach(() => {
    delete process.env.SOLARCH_CONFIG_DIR
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. solarch plugin list --json outputs catalog', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runPluginList({ dir: tempDir, json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.some((p: any) => p.id === '@solarch/plugin-auth-oauth')).toBe(true)

    logSpy.mockRestore()
  })

  it('2. solarch plugin info --json outputs plugin metadata', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runPluginInfo({ plugin: 'storage-s3', json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.id).toBe('@solarch/plugin-storage-s3')
    expect(parsed.environmentRequirements.length).toBeGreaterThan(0)

    logSpy.mockRestore()
  })

  it('3. solarch plugin add, remove, enable, disable manages project manifest', async () => {
    // Add plugin
    await runPluginAdd({ plugins: ['storage-s3'], dir: tempDir })
    let manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.plugins.list).toContain('@solarch/plugin-storage-s3')

    // Disable plugin
    await runPluginDisable({ plugin: 'storage-s3', dir: tempDir })
    manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.plugins.list).not.toContain('@solarch/plugin-storage-s3')

    // Enable plugin
    await runPluginEnable({ plugin: 'storage-s3', dir: tempDir })
    manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.plugins.list).toContain('@solarch/plugin-storage-s3')

    // Remove plugin
    await runPluginRemove({ plugins: ['storage-s3'], dir: tempDir })
    manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.plugins.list).not.toContain('@solarch/plugin-storage-s3')
  })

  it('4. solarch plugin sync reconciles remote platform plugin requirements', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-plug-123/config')) {
        return new Response(JSON.stringify(mockRemoteConfig), { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    })

    await runPluginSync({ dir: tempDir })

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.plugins.list).toContain('@solarch/plugin-auth-oauth')
    expect(manifest?.plugins.list).toContain('@solarch/plugin-billing-stripe')

    fetchSpy.mockRestore()
  })
})
