import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runProjectDiff } from '../project/diff.js'
import { runProjectPull } from '../project/pull.js'
import { runProjectPush } from '../project/push.js'
import { BaseSnapshotStore } from '../../platform/state/base-snapshot.js'
import { SessionStore } from '../../platform/auth/session-store.js'
import { PlatformProjectConfig } from '../../platform/schema/project-config.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('Project Capability & Synchronization CLI Commands (Phase 4)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore

  const mockRemoteConfig: PlatformProjectConfig = {
    schemaVersion: '1.0.0',
    configVersion: 10,
    projectId: 'prj-cap-123',
    orgId: 'org-cap-456',
    name: 'cap-test-app',
    capabilities: {
      auth: { enabled: true },
      ai: { enabled: true, config: { vectorSearch: true, models: ['text-embedding-3-small'] } },
    },
    database: { engine: 'postgres', provider: 'neon', features: { vector: true } },
    sdkRequirements: [
      { sdk: '@solarch/core-client', required: true },
      { sdk: 'solarch-ai', required: true },
    ],
    pluginRequirements: [{ name: 'auth-oauth' }],
    environments: {
      development: {
        name: 'development',
        variables: [{ key: 'PORT', defaultValue: '8090' }],
        secretNames: ['DATABASE_URL', 'OPENAI_API_KEY'],
      },
    },
    updatedAt: new Date().toISOString(),
  }

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cmd-cap-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    process.env.SOLARCH_CONFIG_DIR = configDir
    sessionStore = new SessionStore(configDir)

    // Save mock machine token
    await sessionStore.saveCredentials({ accessToken: 'valid-cap-token' })

    // Create manifest
    const plan = RecommendationEngine.createPlan(
      { name: 'cap-test-app', dir: tempDir },
      new ProjectIntent({ application: 'web', deployment: 'local' })
    )
    const manifest = ProjectMetadata.fromPlan(plan)
    manifest.platform = {
      projectId: 'prj-cap-123',
      orgId: 'org-cap-456',
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

  it('1. solarch project diff --json outputs 3-way comparison', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-cap-123/config')) {
        return new Response(JSON.stringify(mockRemoteConfig), { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runProjectDiff({ dir: tempDir, json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed).toHaveProperty('entries')
    expect(parsed).toHaveProperty('hasConflicts')

    logSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('2. solarch project pull updates manifest, base snapshot, and enforces idempotency', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-cap-123/config')) {
        return new Response(JSON.stringify(mockRemoteConfig), { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    })

    // First pull
    await runProjectPull({ dir: tempDir })

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).toContain('solarch-ai')
    expect(manifest?.plugins.list).toContain('auth-oauth')

    // Verify base snapshot saved
    const base = await BaseSnapshotStore.getBase(tempDir)
    expect(base?.configVersion).toBe(10)
    expect(base?.projectId).toBe('prj-cap-123')

    // Second pull (Idempotency test)
    await runProjectPull({ dir: tempDir })
    const baseAfter = await BaseSnapshotStore.getBase(tempDir)
    expect(baseAfter?.configVersion).toBe(10)

    fetchSpy.mockRestore()
  })

  it('3. solarch project push enforces optimistic concurrency and rejects stale pushes', async () => {
    // Save base snapshot with version 10
    await BaseSnapshotStore.saveBase(tempDir, mockRemoteConfig)

    // Remote has advanced to version 11
    const advancedRemoteConfig: PlatformProjectConfig = {
      ...mockRemoteConfig,
      configVersion: 11,
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-cap-123/config')) {
        return new Response(JSON.stringify(advancedRemoteConfig), { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    })

    // Push should fail due to concurrency conflict (remote version 11 > base version 10)
    await expect(runProjectPush({ dir: tempDir, yes: true })).rejects.toThrow('Concurrency conflict')

    fetchSpy.mockRestore()
  })
})
