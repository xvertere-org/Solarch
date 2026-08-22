import { describe, it, expect } from 'vitest'
import { ThreeWayDiffer } from '../reconciliation/differ.js'
import { Reconciler } from '../reconciliation/reconciler.js'
import { PlatformProjectConfig } from '../schema/project-config.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

describe('True Three-Way Differ & Reconciler (Phase 4)', () => {
  const baseConfig: PlatformProjectConfig = {
    schemaVersion: '1.0.0',
    configVersion: 1,
    projectId: 'prj-recon',
    orgId: 'org-recon',
    name: 'recon-app',
    capabilities: {
      auth: { enabled: true },
    },
    database: { engine: 'sqlite', provider: 'local', features: { vector: false } },
    sdkRequirements: [{ sdk: '@solarch/core-client', required: true }],
    pluginRequirements: [{ name: 'auth-email' }],
    environments: {},
    updatedAt: '2026-08-20T10:00:00Z',
  }

  const localManifest: ProjectManifest = {
    schemaVersion: 1,
    name: 'recon-app',
    application: 'web',
    runtimeVersion: '0.19.8',
    database: {
      engine: 'sqlite',
      topology: 'standalone',
      capabilities: {},
      source: 'intent',
    },
    sdks: ['@solarch/core-client', 'solarch-web'], // local added solarch-web
    plugins: {
      mode: 'opt-in',
      list: ['auth-email'],
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  }

  const remoteConfig: PlatformProjectConfig = {
    ...baseConfig,
    configVersion: 2,
    sdkRequirements: [
      { sdk: '@solarch/core-client', required: true },
      { sdk: 'solarch-ai', required: true }, // remote added solarch-ai
    ],
    pluginRequirements: [
      { name: 'auth-email' },
      { name: 'billing-stripe' }, // remote added billing-stripe
    ],
  }

  it('1. detects clean 3-way non-conflicting additions from both local and remote', () => {
    const diff = ThreeWayDiffer.diff(baseConfig, localManifest, remoteConfig)

    expect(diff.hasConflicts).toBe(false)
    expect(diff.isUpToDate).toBe(false)

    // Remote added solarch-ai and billing-stripe
    const aiSdk = diff.entries.find((e) => e.field === 'sdk:solarch-ai')
    const webSdk = diff.entries.find((e) => e.field === 'sdk:solarch-web')

    expect(aiSdk?.type).toBe('added')
    expect(aiSdk?.isConflict).toBe(false)

    expect(webSdk?.type).toBe('removed') // in local but not remote
    expect(webSdk?.isConflict).toBe(false)
  })

  it('2. detects conflicting modifications between local and remote', () => {
    const conflictingLocal: ProjectManifest = {
      ...localManifest,
      database: {
        ...localManifest.database,
        engine: 'postgres', // local changed engine to postgres
      },
    }

    const conflictingRemote: PlatformProjectConfig = {
      ...remoteConfig,
      database: {
        engine: 'mongodb', // remote changed engine to mongodb
        provider: 'atlas',
        features: { vector: false },
      },
    }

    const diff = ThreeWayDiffer.diff(baseConfig, conflictingLocal, conflictingRemote)
    expect(diff.hasConflicts).toBe(true)

    const dbEntry = diff.entries.find((e) => e.field === 'database.engine')
    expect(dbEntry?.isConflict).toBe(true)
  })

  it('3. Reconciler merges non-conflicting additions into manifest and config', () => {
    const plan = Reconciler.reconcile(baseConfig, localManifest, remoteConfig)

    expect(plan.diffResult.hasConflicts).toBe(false)
    expect(plan.manifestPatch.sdks).toContain('@solarch/core-client')
    expect(plan.manifestPatch.sdks).toContain('solarch-ai')
    expect(plan.manifestPatch.plugins?.list).toContain('billing-stripe')
  })
})
