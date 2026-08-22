/**
 * Solarch Platform Capability Resolver & Validator (Phase 4)
 */

import { CapabilityMap } from '../schema/capability.js'
import { CapabilityMatrix } from './matrix.js'
import { SdkRequirementSpec, PluginRequirementSpec } from '../schema/project-config.js'

export interface ResolvedCapabilityBundle {
  capabilities: CapabilityMap
  sdkRequirements: SdkRequirementSpec[]
  pluginRequirements: PluginRequirementSpec[]
}

export class CapabilityResolver {
  public static resolve(capabilities: CapabilityMap): ResolvedCapabilityBundle {
    const sdkRequirements = CapabilityMatrix.resolveSdkRequirements(capabilities)
    const pluginRequirements = CapabilityMatrix.resolvePluginRequirements(capabilities)

    return {
      capabilities,
      sdkRequirements,
      pluginRequirements,
    }
  }

  public static validate(capabilities: CapabilityMap): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (capabilities.ai?.enabled && capabilities.ai.config) {
      if (
        capabilities.ai.config.vectorSearch &&
        (!capabilities.ai.config.models || capabilities.ai.config.models.length === 0)
      ) {
        errors.push('AI vector search requires at least one configured embedding model.')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
