/**
 * Solarch CLI True Three-Way Differ (Phase 4)
 *
 * Compares BASE, LOCAL (manifest), and REMOTE (Dashboard PlatformProjectConfig).
 */

import { PlatformProjectConfig } from '../schema/project-config.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'
import { DiffEntry, ThreeWayDiffResult } from './types.js'

export class ThreeWayDiffer {
  public static diff(
    base: PlatformProjectConfig | null,
    local: ProjectManifest,
    remote: PlatformProjectConfig
  ): ThreeWayDiffResult {
    const entries: DiffEntry[] = []
    const hasBase = base !== null

    // 1. SDKs diff
    const baseSdks = new Set<string>(base?.sdkRequirements.map((s) => s.sdk) || [])
    const localSdks = new Set<string>(local.sdks || [])
    const remoteSdks = new Set<string>(remote.sdkRequirements.map((s) => s.sdk))

    const allSdks = new Set<string>([...Array.from(baseSdks), ...Array.from(localSdks), ...Array.from(remoteSdks)])

    for (const sdk of allSdks) {
      const inBase = baseSdks.has(sdk)
      const inLocal = localSdks.has(sdk)
      const inRemote = remoteSdks.has(sdk)

      if (inLocal !== inRemote) {
        const isConflict = hasBase && inLocal !== inBase && inRemote !== inBase
        entries.push({
          field: `sdk:${sdk}`,
          category: 'sdk',
          baseValue: inBase,
          localValue: inLocal,
          remoteValue: inRemote,
          type: inRemote && !inLocal ? 'added' : 'removed',
          isConflict,
        })
      }
    }

    // 2. Plugins diff
    const basePlugins = new Set<string>(base?.pluginRequirements.map((p) => p.name) || [])
    const localPlugins = new Set<string>(local.plugins?.list || [])
    const remotePlugins = new Set<string>(remote.pluginRequirements.map((p) => p.name))

    const allPlugins = new Set<string>([
      ...Array.from(basePlugins),
      ...Array.from(localPlugins),
      ...Array.from(remotePlugins),
    ])

    for (const plugin of allPlugins) {
      const inBase = basePlugins.has(plugin)
      const inLocal = localPlugins.has(plugin)
      const inRemote = remotePlugins.has(plugin)

      if (inLocal !== inRemote) {
        const isConflict = hasBase && inLocal !== inBase && inRemote !== inBase
        entries.push({
          field: `plugin:${plugin}`,
          category: 'plugin',
          baseValue: inBase,
          localValue: inLocal,
          remoteValue: inRemote,
          type: inRemote && !inLocal ? 'added' : 'removed',
          isConflict,
        })
      }
    }

    // 3. Database diff
    const baseEngine = base?.database?.engine
    const localEngine = local.database?.engine
    const remoteEngine = remote.database?.engine

    if (localEngine !== remoteEngine) {
      const isConflict = hasBase && localEngine !== baseEngine && remoteEngine !== baseEngine
      entries.push({
        field: 'database.engine',
        category: 'database',
        baseValue: baseEngine,
        localValue: localEngine,
        remoteValue: remoteEngine,
        type: 'modified',
        isConflict,
      })
    }

    // Compute metrics
    const conflicts = entries.filter((e) => e.isConflict)
    const localChanges = entries.filter((e) => e.localValue !== e.baseValue)
    const remoteChanges = entries.filter((e) => e.remoteValue !== e.baseValue)

    return {
      entries,
      hasConflicts: conflicts.length > 0,
      localChangesCount: localChanges.length,
      remoteChangesCount: remoteChanges.length,
      isUpToDate: entries.length === 0,
    }
  }
}
