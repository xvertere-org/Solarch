import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runServiceStatus } from '../service/status.js'
import { runServiceScale } from '../service/scale.js'
import { runServiceTraffic } from '../service/traffic.js'
import { runServiceMaintenance } from '../service/maintenance.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('Service Management CLI Commands (Phase 9)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-svc-cmd-'))
    await ProjectMetadata.writeManifest(tmpDir, {
      schemaVersion: 1,
      name: 'svc-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: [],
      plugins: [],
      platform: {
        projectId: 'prj-svc-1',
        orgId: 'org-1',
        linkedAt: '2026-08-22T00:00:00.000Z',
      },
    })
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('1. solarch service status rejects unauthenticated session', async () => {
    await expect(runServiceStatus({ dir: tmpDir, token: 'invalid' })).rejects.toThrow(
      /Unauthenticated/
    )
  })

  it('2. solarch service scale requires resource flags', async () => {
    await expect(runServiceScale({ dir: tmpDir })).rejects.toThrow(
      /Missing scale arguments/
    )
  })

  it('3. solarch service traffic requires canary ID and weight', async () => {
    await expect(runServiceTraffic({ dir: tmpDir })).rejects.toThrow(
      /Missing traffic arguments/
    )
  })

  it('4. solarch service maintenance validates action parameter', async () => {
    await expect(
      runServiceMaintenance({ dir: tmpDir, action: 'invalid' as unknown as 'on' })
    ).rejects.toThrow(/Invalid maintenance action/)
  })
})
