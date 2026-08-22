/**
 * Solarch CLI Three-Way Reconciler (Phase 4)
 */

import { PlatformProjectConfig } from '../schema/project-config.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'
import { ThreeWayDiffer } from './differ.js'
import { ReconciliationPlan } from './types.js'

export class Reconciler {
  public static reconcile(
    base: PlatformProjectConfig | null,
    local: ProjectManifest,
    remote: PlatformProjectConfig,
    options: {
      strategy?: 'theirs' | 'ours' | 'safe'
      force?: boolean
    } = {}
  ): ReconciliationPlan {
    const diffResult = ThreeWayDiffer.diff(base, local, remote)
    const strategy = options.force ? 'theirs' : options.strategy || 'safe'

    const resolvedSdks = new Set<string>(local.sdks || [])
    const resolvedPlugins = new Set<string>(local.plugins?.list || [])

    for (const entry of diffResult.entries) {
      if (entry.category === 'sdk') {
        const sdkName = entry.field.replace('sdk:', '')
        if (!entry.isConflict || strategy === 'theirs') {
          if (entry.remoteValue) {
            resolvedSdks.add(sdkName)
          } else {
            resolvedSdks.delete(sdkName)
          }
          entry.resolutionStrategy = 'remote'
        } else if (strategy === 'ours') {
          entry.resolutionStrategy = 'local'
        }
      }

      if (entry.category === 'plugin') {
        const pluginName = entry.field.replace('plugin:', '')
        if (!entry.isConflict || strategy === 'theirs') {
          if (entry.remoteValue) {
            resolvedPlugins.add(pluginName)
          } else {
            resolvedPlugins.delete(pluginName)
          }
          entry.resolutionStrategy = 'remote'
        } else if (strategy === 'ours') {
          entry.resolutionStrategy = 'local'
        }
      }
    }

    const manifestPatch: Partial<ProjectManifest> = {
      sdks: Array.from(resolvedSdks),
      plugins: {
        mode: local.plugins?.mode || 'opt-in',
        list: Array.from(resolvedPlugins),
      },
    }

    const mergedRemoteConfig: PlatformProjectConfig = {
      ...remote,
      sdkRequirements: Array.from(resolvedSdks).map((sdk) => ({
        sdk,
        required: true,
      })),
      pluginRequirements: Array.from(resolvedPlugins).map((name) => ({
        name,
      })),
    }

    return {
      mergedRemoteConfig,
      manifestPatch,
      diffResult,
      isIdempotent: diffResult.isUpToDate,
    }
  }
}
