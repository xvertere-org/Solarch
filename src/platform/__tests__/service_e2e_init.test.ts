import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('E2E Lifecycle 1: Project Init, Link & Sync (Phase 9)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-e2e-init-'))
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  })

  it('1. Executes end-to-end init -> link -> sync manifest persistence', async () => {
    // 1. Initial local manifest creation
    await ProjectMetadata.writeManifest(tmpDir, {
      schemaVersion: 1,
      name: 'e2e-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: ['@solarch/core-client'],
      plugins: [],
    })

    const initial = await ProjectMetadata.readManifest(tmpDir)
    expect(initial?.name).toBe('e2e-app')
    expect(initial?.platform).toBeUndefined()

    // 2. Link platform project
    const linked = await ProjectMetadata.linkProject(tmpDir, {
      projectId: 'prj_e2e_001',
      orgId: 'org_e2e',
    })

    expect(linked.platform?.projectId).toBe('prj_e2e_001')

    // 3. Verify on disk
    const onDisk = await ProjectMetadata.readManifest(tmpDir)
    expect(onDisk?.platform?.projectId).toBe('prj_e2e_001')
  })
})
