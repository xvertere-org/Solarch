import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { BaseSnapshotStore } from '../state/base-snapshot.js'
import { PlatformProjectConfig } from '../schema/project-config.js'

describe('BaseSnapshotStore (Phase 4)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-base-snapshot-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. saves and retrieves persistent base snapshot at .solarch/state/platform-base.json', async () => {
    const mockConfig: PlatformProjectConfig = {
      schemaVersion: '1.0.0',
      configVersion: 5,
      projectId: 'prj-test-base',
      orgId: 'org-test-base',
      name: 'test-base-app',
      capabilities: {
        auth: { enabled: true },
      },
      database: {
        engine: 'postgres',
        provider: 'neon',
        features: { vector: true },
      },
      sdkRequirements: [{ sdk: '@solarch/core-client', required: true }],
      pluginRequirements: [],
      environments: {
        development: {
          name: 'development',
          variables: [{ key: 'PORT', defaultValue: '8090' }],
          secretNames: ['DATABASE_URL', 'JWT_SECRET'],
        },
      },
      updatedAt: new Date().toISOString(),
    }

    await BaseSnapshotStore.saveBase(tempDir, mockConfig)

    const expectedPath = path.join(tempDir, '.solarch/state/platform-base.json')
    expect(fs.existsSync(expectedPath)).toBe(true)

    const loaded = await BaseSnapshotStore.getBase(tempDir)
    expect(loaded?.projectId).toBe('prj-test-base')
    expect(loaded?.configVersion).toBe(5)
    expect(loaded?.database.provider).toBe('neon')
  })

  it('2. clears base snapshot cleanly', async () => {
    await BaseSnapshotStore.saveBase(tempDir, {
      schemaVersion: '1.0.0',
      configVersion: 1,
      projectId: 'prj-1',
      orgId: 'org-1',
      name: 'test',
      capabilities: {},
      database: { engine: 'sqlite', provider: 'local', features: { vector: false } },
      sdkRequirements: [],
      pluginRequirements: [],
      environments: {},
      updatedAt: new Date().toISOString(),
    })

    await BaseSnapshotStore.clearBase(tempDir)
    const loaded = await BaseSnapshotStore.getBase(tempDir)
    expect(loaded).toBeNull()
  })
})
