/**
 * Solarch Platform Capability Requirements Matrix (Phase 4)
 */

import { SdkRequirementSpec, PluginRequirementSpec } from '../schema/project-config.js'
import { CapabilityMap } from '../schema/capability.js'

export class CapabilityMatrix {
  /**
   * Resolves SDK requirements from active capabilities.
   */
  public static resolveSdkRequirements(capabilities: CapabilityMap): SdkRequirementSpec[] {
    const requirements: SdkRequirementSpec[] = [
      { sdk: '@solarch/core-client', minVersion: '^0.19.8', required: true },
    ]

    const hasWeb = capabilities.realtime?.enabled || capabilities.auth?.enabled
    if (hasWeb) {
      requirements.push({ sdk: 'solarch-web', minVersion: '^0.19.8', required: false })
    }

    if (capabilities.ai?.enabled) {
      requirements.push({ sdk: 'solarch-ai', minVersion: '^0.19.8', required: true })
    }

    return requirements
  }

  /**
   * Resolves Plugin requirements from active capabilities.
   */
  public static resolvePluginRequirements(capabilities: CapabilityMap): PluginRequirementSpec[] {
    const plugins: PluginRequirementSpec[] = []

    if (capabilities.storage?.enabled && capabilities.storage.config?.provider === 's3') {
      plugins.push({ name: 'storage-s3', version: '^1.0.0' })
    }

    return plugins
  }
}
