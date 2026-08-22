import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SdkInstaller } from '../sdk/installer.js'
import { PackageManagerDetector } from '../sdk/package-manager.js'
import { ProjectMetadata, ProjectIntent, RecommendationEngine } from '../../ecosystem/index.js'

describe('SdkInstaller & Sync Plan (Phase 3 & Ecosystem Alignment)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-sdk-installer-test-'))

    // Baseline package.json with solarch-web installed
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        dependencies: {
          'solarch-web': '^0.19.8',
        },
      }),
      'utf-8'
    )

    // Baseline manifest requiring solarch-web and solarch-ai
    const plan = RecommendationEngine.createPlan(
      { name: 'test-app', dir: tempDir },
      new ProjectIntent({
        application: 'ai',
        deployment: 'local',
        explicitChoices: {
          sdks: ['solarch-web', 'solarch-ai'],
        },
      })
    )
    await ProjectMetadata.writeManifest(tempDir, ProjectMetadata.fromPlan(plan))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. lists installed and required SDK status', async () => {
    const list = await SdkInstaller.listSdkStatus(tempDir)
    const webSdk = list.find((s) => s.name === 'solarch-web')
    const aiSdk = list.find((s) => s.name === 'solarch-ai')
    const mobileSdk = list.find((s) => s.name === 'solarch-rn')

    expect(webSdk?.installed).toBe(true)
    expect(webSdk?.required).toBe(true)
    expect(webSdk?.currentVersion).toBe('^0.19.8')

    expect(aiSdk?.installed).toBe(false)
    expect(aiSdk?.required).toBe(true)

    expect(mobileSdk?.installed).toBe(false)
    expect(mobileSdk?.required).toBe(false)
  })

  it('2. computes accurate sync plan identifying missing SDKs', async () => {
    const plan = await SdkInstaller.computeSyncPlan(tempDir)

    expect(plan.isUpToDate).toBe(false)
    expect(plan.alreadyInstalled).toContain('solarch-web')
    expect(plan.toInstall).toContain('solarch-ai')
    expect(plan.toInstall.length).toBe(1)
  })

  it('3. installSdks updates .solarch/project.json manifest', async () => {
    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('Installed ok')

    await SdkInstaller.installSdks(tempDir, ['solarch-rn'])

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).toContain('solarch-rn')
    expect(manifest?.sdks).toContain('solarch-web')
    expect(manifest?.sdks).toContain('solarch-ai')

    execSpy.mockRestore()
  })

  it('4. removeSdks removes package from .solarch/project.json manifest', async () => {
    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('Removed ok')

    await SdkInstaller.removeSdks(tempDir, ['solarch-ai'])

    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).not.toContain('solarch-ai')
    expect(manifest?.sdks).toContain('solarch-web')

    execSpy.mockRestore()
  })
})
