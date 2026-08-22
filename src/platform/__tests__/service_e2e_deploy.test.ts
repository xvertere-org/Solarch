import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { DeploymentPackager } from '../deployment/packager.js'
import { ServiceLifecycleManager } from '../service/lifecycle.js'

describe('E2E Lifecycle 2: Deterministic Deploy, Health Gate & Staged Traffic (Phase 9)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-e2e-deploy-'))
    await fs.promises.writeFile(path.join(tmpDir, 'index.js'), 'console.log("App ready")')
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'deploy-app', version: '1.0.0' })
    )
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  })

  it('1. Executes zero-secret packaging -> deployment -> staged traffic allocation', async () => {
    const manifest = {
      schemaVersion: 1 as const,
      name: 'deploy-app',
      application: 'web',
      runtimeVersion: '0.19.8',
      database: {
        engine: 'sqlite',
        topology: 'embedded',
        capabilities: {},
        source: 'solarch',
      },
      sdks: [],
      plugins: { mode: 'whitelist', list: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const bundle = await DeploymentPackager.createBundle(tmpDir, manifest, {
      projectId: 'prj_deploy_e2e',
      environment: 'production',
      runtimeVersion: '0.19.8',
      cliVersion: '0.19.8',
    })

    expect(bundle.bundleHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(bundle.fileCount).toBeGreaterThanOrEqual(2)

    // Stage canary deployment with ServiceLifecycleManager
    const manager = new ServiceLifecycleManager('prj_deploy_e2e', 'production', {
      activeDeployment: { id: 'dep_prod_v1', version: '1.0.0', bundleHash: 'hash_v1' },
      trafficPolicy: { allowedStages: [10, 25, 50, 100] },
    })

    // Step 1: 10% canary
    const stage1 = manager.setTraffic('dep_prod_v2', 10, 'healthy', 'ci_bot')
    expect(stage1.success).toBe(true)
    expect(stage1.allocations?.find((a) => a.deploymentId === 'dep_prod_v2')?.weight).toBe(10)

    // Step 2: 25% canary
    const stage2 = manager.setTraffic('dep_prod_v2', 25, 'healthy', 'ci_bot')
    expect(stage2.success).toBe(true)
    expect(stage2.allocations?.find((a) => a.deploymentId === 'dep_prod_v2')?.weight).toBe(25)

    // Step 3: Full promotion (100%)
    const stage3 = manager.setTraffic('dep_prod_v2', 100, 'healthy', 'ci_bot')
    expect(stage3.success).toBe(true)

    const dashboard = manager.getDashboard()
    expect(dashboard.activeDeployment.id).toBe('dep_prod_v2')
    expect(dashboard.canaryDeployment).toBeUndefined()
  })
})
