/**
 * Solarch Platform Plugin Dependency & Compatibility Resolver (Phase 5)
 */

import { PluginRegistry } from './registry.js'
import { PluginDescriptor } from './types.js'

export interface ResolvedPluginBundle {
  descriptors: PluginDescriptor[]
  requiredSdks: string[]
  missingDependencies: string[]
  conflicts: string[]
}

export class PluginResolver {
  public static resolve(pluginIds: string[]): ResolvedPluginBundle {
    const descriptors: PluginDescriptor[] = []
    const requiredSdks = new Set<string>()
    const missingDependencies: string[] = []
    const conflicts: string[] = []

    const resolvedIds = new Set<string>()

    for (const rawId of pluginIds) {
      const canonicalId = PluginRegistry.normalizeId(rawId)
      const descriptor = PluginRegistry.get(canonicalId)

      if (!descriptor) {
        // Unknown or custom plugin
        descriptors.push({
          id: canonicalId,
          name: PluginRegistry.getShortName(canonicalId),
          title: canonicalId,
          description: 'Community or local plugin',
          category: 'utilities',
          source: canonicalId.startsWith('local:') ? 'local' : 'community',
          publisher: 'Unknown',
          environmentRequirements: [],
          hooks: ['onInit'],
        })
        resolvedIds.add(canonicalId)
        continue
      }

      descriptors.push(descriptor)
      resolvedIds.add(canonicalId)

      if (descriptor.requiresSdks) {
        for (const sdk of descriptor.requiresSdks) {
          requiredSdks.add(sdk)
        }
      }
    }

    // Check inter-plugin requirements & conflicts
    for (const desc of descriptors) {
      if (desc.requiresPlugins) {
        for (const req of desc.requiresPlugins) {
          const canonicalReq = PluginRegistry.normalizeId(req)
          if (!resolvedIds.has(canonicalReq)) {
            missingDependencies.push(`Plugin ${desc.id} requires ${canonicalReq}`)
          }
        }
      }

      if (desc.conflictsWith) {
        for (const conf of desc.conflictsWith) {
          const canonicalConf = PluginRegistry.normalizeId(conf)
          if (resolvedIds.has(canonicalConf)) {
            conflicts.push(`Plugin ${desc.id} conflicts with ${canonicalConf}`)
          }
        }
      }
    }

    return {
      descriptors,
      requiredSdks: Array.from(requiredSdks),
      missingDependencies,
      conflicts,
    }
  }
}
