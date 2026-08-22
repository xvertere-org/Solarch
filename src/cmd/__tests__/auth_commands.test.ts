import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runLogin } from '../auth/login.js'
import { runLogout } from '../auth/logout.js'
import { runWhoami } from '../auth/whoami.js'
import { runLink } from '../auth/link.js'
import { runUnlink } from '../auth/unlink.js'
import { runDoctor } from '../doctor.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { SessionStore } from '../../platform/auth/session-store.js'
import { PlatformConfig } from '../../platform/config.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('Auth & Platform CLI Commands (Phase 2)', () => {
  let tempDir: string
  let configDir: string
  let sessionStore: SessionStore
  let config: PlatformConfig
  let authService: AuthService

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cmd-auth-test-'))
    configDir = path.join(tempDir, '.config-solarch')
    sessionStore = new SessionStore(configDir)
    config = new PlatformConfig({ apiBaseUrl: 'https://mock.api.solarch.in' })
    authService = new AuthService(config, sessionStore)

    // Write a baseline valid project manifest
    const plan = RecommendationEngine.createPlan(
      { name: 'test-app', dir: tempDir },
      new ProjectIntent({
        application: 'web',
        deployment: 'local',
      })
    )
    await ProjectMetadata.writeManifest(tempDir, ProjectMetadata.fromPlan(plan))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
    delete process.env.SOLARCH_TOKEN
  })

  it('1. solarch login --token authenticates and persists machine session', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-1', email: 'dev@solarch.in', currentOrgId: 'org-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    await runLogin({
      token: 'cli-test-token-123',
      authService,
    })

    const stored = await sessionStore.loadCredentials()
    expect(stored?.accessToken).toBe('cli-test-token-123')

    fetchSpy.mockRestore()
  })

  it('2. solarch logout clears machine credentials', async () => {
    await sessionStore.saveCredentials({ accessToken: 'to-be-cleared' })
    expect(await sessionStore.loadCredentials()).not.toBeNull()

    await runLogout({ authService })
    expect(await sessionStore.loadCredentials()).toBeNull()
  })

  it('3. solarch whoami --json outputs zero-secret JSON metadata', async () => {
    await sessionStore.saveCredentials({ accessToken: 'valid-token-777' })

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-777', email: 'user777@solarch.in', tier: 'enterprise', currentOrgId: 'org-ent' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runWhoami({
      json: true,
      dir: tempDir,
      authService,
    })

    expect(logSpy).toHaveBeenCalled()
    const rawJson = logSpy.mock.calls[0][0]
    const parsed = JSON.parse(rawJson)

    expect(parsed.authenticated).toBe(true)
    expect(parsed.user.id).toBe('u-777')
    expect(parsed.user.email).toBe('user777@solarch.in')
    expect(parsed.user.tier).toBe('enterprise')
    expect(parsed.organization.id).toBe('org-ent')
    expect(parsed.source).toBe('session')

    // Invariant: zero token strings
    expect(rawJson).not.toContain('valid-token-777')

    logSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('4. solarch link validates project ownership and patches .solarch/project.json atomically', async () => {
    await sessionStore.saveCredentials({ accessToken: 'admin-token-1' })

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = url.toString()
      if (urlStr.includes('/v1/user/whoami')) {
        return new Response(
          JSON.stringify({ id: 'u-1', email: 'admin@solarch.in', currentOrgId: 'org-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/v1/organizations')) {
        return new Response(
          JSON.stringify({ organizations: [{ id: 'org-1', name: 'Solarch Org', slug: 'solarch-org' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('/v1/projects/prj-alpha')) {
        return new Response(
          JSON.stringify({ id: 'prj-alpha', name: 'Alpha Project', slug: 'alpha', orgId: 'org-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    await runLink({
      dir: tempDir,
      project: 'prj-alpha',
      org: 'org-1',
      yes: true,
      authService,
    })

    const updatedManifest = await ProjectMetadata.readManifest(tempDir)
    expect(updatedManifest?.platform).toBeDefined()
    expect(updatedManifest?.platform?.projectId).toBe('prj-alpha')
    expect(updatedManifest?.platform?.orgId).toBe('org-1')
    expect(updatedManifest?.platform?.linkedAt).toBeDefined()

    // Manifest preservation: all original Phase 1 fields intact
    expect(updatedManifest?.name).toBe('test-app')
    expect(updatedManifest?.application).toBe('web')
    expect(updatedManifest?.database.engine).toBe('sqlite')

    fetchSpy.mockRestore()
  })

  it('5. solarch unlink removes remote linkage while preserving local configuration', async () => {
    // Link first
    await ProjectMetadata.linkProject(tempDir, { projectId: 'prj-to-unlink', orgId: 'org-1' })
    let manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.platform).toBeDefined()

    await runUnlink({ dir: tempDir })

    manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.platform).toBeUndefined()
    expect(manifest?.name).toBe('test-app')
    expect(manifest?.application).toBe('web')
  })

  it('6. solarch doctor includes platform authentication status and remains healthy offline', async () => {
    const report = await runDoctor({
      cwd: tempDir,
      silent: true,
      exitOnComplete: false,
    })

    const platformCheck = report.checks.find((c) => c.id === 'platform_auth')
    expect(platformCheck).toBeDefined()
    expect(platformCheck?.name).toBe('Platform Authentication')
    // In unauthenticated offline mode without platform linkage, check passes gracefully
    expect(platformCheck?.status).toBe('pass')
    expect(report.overallStatus).not.toBe('unhealthy')
  })
})
