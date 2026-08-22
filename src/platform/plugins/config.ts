/**
 * Solarch Platform Plugin Configuration Scaffolder & Manager (Phase 5)
 */

import { PluginDescriptor, PluginEnvironmentRequirement } from './types.js'

export class PluginConfigManager {
  /**
   * Generates default non-secret configuration object for a plugin.
   */
  public static getScaffoldedConfig(descriptor: PluginDescriptor): Record<string, any> {
    return descriptor.defaultConfig ? { ...descriptor.defaultConfig } : {}
  }

  /**
   * Collects all environment variable requirements across a list of plugins.
   */
  public static getRequiredEnvList(descriptors: PluginDescriptor[]): PluginEnvironmentRequirement[] {
    const seen = new Set<string>()
    const envList: PluginEnvironmentRequirement[] = []

    for (const desc of descriptors) {
      for (const req of desc.environmentRequirements) {
        if (!seen.has(req.key)) {
          seen.add(req.key)
          envList.push(req)
        }
      }
    }

    return envList
  }
}
