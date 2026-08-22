import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runDeploy } from '../deploy/deploy.js'
import { runDeployList } from '../deploy/list.js'
import { runDeployStatus } from '../deploy/status.js'
import { runDeployRollback } from '../deploy/rollback.js'
import { runDeployLogs } from '../deploy/logs.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('Deployment CLI Commands (Phase 7)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-deploy-cmd-'))
    await fs.promises.mkdir(path.join(tmpDir, 'src'), { recursive: true })

    await ProjectMetadata.writeManifest(tmpDir, {
      schemaVersion: 1,
      name: 'deploy-cmd-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: [],
      plugins: [],
      platform: {
        projectId: 'prj-deploy-1',
        orgId: 'org-1',
        linkedAt: '2026-08-22T00:00:00.000Z',
      },
    })

    await fs.promises.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'export const hello = "world"\n')
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('1. solarch deploy --dry-run previews package bundle without platform mutation', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runDeploy({
      dir: tmpDir,
      dryRun: true,
      env: 'staging',
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Solarch Deployment Preview (Dry Run)')
    )
  })

  it('2. solarch deploy rejects unlinked projects', async () => {
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

    await expect(runDeploy({ dir: unlinkedDir })).rejects.toThrow(/Project not linked/)
    await fs.promises.rm(unlinkedDir, { recursive: true, force: true })
  })

  it('3. solarch deploy rollback requires target deployment ID', async () => {
    await expect(runDeployRollback({ dir: tmpDir, target: '' })).rejects.toThrow(
      /Target deployment required/
    )
  })
})
