import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { DeploymentPackager } from '../deployment/packager.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

describe('Deployment Bundle Reproducibility & Determinism (Phase 7)', () => {
  let tmpDir1: string
  let tmpDir2: string

  const sampleManifest: ProjectManifest = {
    schemaVersion: 1,
    name: 'test-app',
    runtimeVersion: '0.19.8',
    capabilities: {},
    sdks: [],
    plugins: [],
    platform: {
      projectId: 'prj-test-123',
      orgId: 'org-1',
      linkedAt: '2026-08-22T00:00:00.000Z',
    },
  }

  beforeEach(async () => {
    tmpDir1 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-deploy-repro-1-'))
    tmpDir2 = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-deploy-repro-2-'))

    // Setup identical source files
    await fs.promises.mkdir(path.join(tmpDir1, 'src'), { recursive: true })
    await fs.promises.mkdir(path.join(tmpDir2, 'src'), { recursive: true })

    const fileContentA = 'console.log("hello world")\n'
    const fileContentB = JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)

    await fs.promises.writeFile(path.join(tmpDir1, 'src', 'index.ts'), fileContentA)
    await fs.promises.writeFile(path.join(tmpDir1, 'package.json'), fileContentB)

    await fs.promises.writeFile(path.join(tmpDir2, 'src', 'index.ts'), fileContentA)
    await fs.promises.writeFile(path.join(tmpDir2, 'package.json'), fileContentB)
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir1, { recursive: true, force: true })
    await fs.promises.rm(tmpDir2, { recursive: true, force: true })
  })

  it('1. Generates identical SHA256 bundle hash for identical file trees', async () => {
    const bundle1 = await DeploymentPackager.createBundle(tmpDir1, sampleManifest, {
      environment: 'production',
    })
    const bundle2 = await DeploymentPackager.createBundle(tmpDir2, sampleManifest, {
      environment: 'production',
    })

    expect(bundle1.bundleHash).toBe(bundle2.bundleHash)
    expect(bundle1.bundleHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(bundle1.fileCount).toBe(2)
  })

  it('2. Generates different SHA256 bundle hash if content changes', async () => {
    const bundle1 = await DeploymentPackager.createBundle(tmpDir1, sampleManifest, {
      environment: 'production',
    })

    // Modify file in dir 2
    await fs.promises.writeFile(path.join(tmpDir2, 'src', 'index.ts'), 'console.log("changed")\n')

    const bundle2 = await DeploymentPackager.createBundle(tmpDir2, sampleManifest, {
      environment: 'production',
    })

    expect(bundle1.bundleHash).not.toBe(bundle2.bundleHash)
  })

  it('3. Captures full configuration, lockfile hash, and topology provenance in DeploymentBundleSpec', async () => {
    await fs.promises.writeFile(path.join(tmpDir1, 'package-lock.json'), '{"lockfileVersion": 3}')

    const bundle = await DeploymentPackager.createBundle(tmpDir1, sampleManifest, {
      environment: 'production',
      commitSha: 'c0ffee1234567890',
      branch: 'main',
      dirtyState: false,
    })

    expect(bundle.spec.commitSha).toBe('c0ffee1234567890')
    expect(bundle.spec.branch).toBe('main')
    expect(bundle.spec.dirtyState).toBe(false)
    expect(bundle.spec.packageManager).toBe('npm')
    expect(bundle.spec.lockfileHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(bundle.spec.databaseTopologyRevision).toBe('sqlite:local:standalone')
    expect(bundle.spec.platformConfigVersion).toBe(1)
  })
})
