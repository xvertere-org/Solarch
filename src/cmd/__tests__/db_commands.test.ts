import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runDbStatus } from '../db/status.js'
import { runDbProvision } from '../db/provision.js'
import { runDbSync } from '../db/sync.js'
import { SessionStore } from '../../platform/auth/session-store.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('Database CLI Commands (Phase 6)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cmd-db-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    process.env.SOLARCH_CONFIG_DIR = configDir
    sessionStore = new SessionStore(configDir)

    await sessionStore.saveCredentials({ accessToken: 'valid-db-token' })

    const plan = RecommendationEngine.createPlan(
      { name: 'db-test-app', dir: tempDir },
      new ProjectIntent({ application: 'web', deployment: 'cloud', database: 'postgres' })
    )
    const manifest = ProjectMetadata.fromPlan(plan)
    manifest.platform = {
      projectId: 'prj-db-123',
      orgId: 'org-db-456',
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

  it('1. solarch db status --json outputs local vs remote database topology', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-db-123/database/topology')) {
        return new Response(
          JSON.stringify({
            engine: 'postgres',
            provider: 'neon',
            topology: 'serverless',
            host: 'ep-cool.neon.tech',
            secretRefs: ['DATABASE_URL'],
          }),
          { status: 200 }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runDbStatus({ dir: tempDir, json: true, env: 'staging' })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.environment).toBe('staging')
    expect(parsed.remote.provider).toBe('neon')
    expect(parsed.remote.topology).toBe('serverless')

    fetchSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('2. solarch db provision --dry-run does not mutate remote or local files', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runDbProvision({ dir: tempDir, dryRun: true, env: 'staging' })

    expect(logSpy).toHaveBeenCalled()
    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.database.provider).toBeUndefined()

    logSpy.mockRestore()
  })

  it('3. solarch db sync aligns local manifest with remote platform database configuration', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(JSON.stringify({ id: 'u-1', email: 'dev@solarch.in' }), { status: 200 })
      }
      if (urlStr.includes('/v1/projects/prj-db-123/database/topology')) {
        return new Response(
          JSON.stringify({
            engine: 'postgres',
            provider: 'neon',
            topology: 'serverless',
            host: 'ep-cool.neon.tech',
            secretRefs: ['DATABASE_URL'],
          }),
          { status: 200 }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    await runDbSync({ dir: tempDir, env: 'production' })

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.database.provider).toBe('neon')
    expect(manifest?.database.topology).toBe('serverless')
    expect(manifest?.database.source).toBe('platform')

    fetchSpy.mockRestore()
  })
})
