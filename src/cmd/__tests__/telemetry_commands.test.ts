import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runMetrics } from '../telemetry/metrics.js'
import { runTraces } from '../telemetry/traces.js'
import { runAlerts } from '../telemetry/alerts.js'
import { runLogs } from '../logs/index.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('Telemetry & Observability CLI Commands (Phase 8)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-telemetry-cmd-'))
    await ProjectMetadata.writeManifest(tmpDir, {
      schemaVersion: 1,
      name: 'telemetry-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: [],
      plugins: [],
      platform: {
        projectId: 'prj-tel-1',
        orgId: 'org-1',
        linkedAt: '2026-08-22T00:00:00.000Z',
      },
    })
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('1. solarch metrics rejects unauthenticated session', async () => {
    await expect(runMetrics({ dir: tmpDir, token: 'invalid' })).rejects.toThrow(
      /Unauthenticated/
    )
  })

  it('2. solarch traces rejects unlinked projects', async () => {
    const unlinkedDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-unlinked-'))
    await ProjectMetadata.writeManifest(unlinkedDir, {
      schemaVersion: 1,
      name: 'unlinked-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: [],
      plugins: [],
    })

    await expect(runTraces({ dir: unlinkedDir })).rejects.toThrow(/Project not linked/)
    await fs.promises.rm(unlinkedDir, { recursive: true, force: true })
  })

  it('3. solarch alerts rejects unauthenticated session', async () => {
    await expect(runAlerts({ dir: tmpDir, token: 'invalid' })).rejects.toThrow(
      /Unauthenticated/
    )
  })

  it('4. solarch logs preserves local offline behavior when --env is omitted', async () => {
    // In local mode without --env and without existing pb_data, runLogs returns []
    const logs = await runLogs({ dir: tmpDir, exitOnComplete: false })
    expect(logs).toEqual([])
  })
})
