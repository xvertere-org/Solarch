/**
 * Solarch Platform Plugin Validator (Phase 5)
 */

import { PluginDescriptor, PluginValidationResult } from './types.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

export class PluginValidator {
  public static validate(
    descriptor: PluginDescriptor,
    manifest: ProjectManifest,
    config: Record<string, any> = {}
  ): PluginValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Validate required capabilities
    if (descriptor.requiresCapabilities) {
      for (const [capKey, expectedValue] of Object.entries(descriptor.requiresCapabilities)) {
        if (capKey === 'auth.enabled' && !manifest.application.includes('auth')) {
          // Check capability or default
        }
        if (capKey === 'database.engine' && manifest.database.engine !== expectedValue) {
          errors.push(
            `Plugin ${descriptor.id} requires database engine "${expectedValue}", but project is configured with "${manifest.database.engine}".`
          )
        }
      }
    }

    // 2. Validate conflicts
    if (descriptor.conflictsWith && manifest.plugins?.list) {
      for (const conflict of descriptor.conflictsWith) {
        if (manifest.plugins.list.includes(conflict)) {
          errors.push(`Plugin ${descriptor.id} conflicts with installed plugin "${conflict}".`)
        }
      }
    }

    // 3. Validate zero-secret invariant in config object
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string') {
        const lowerKey = key.toLowerCase()
        if (
          (lowerKey.includes('secret') || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('password')) &&
          !val.startsWith('$') && // environment reference
          !val.toUpperCase().includes('_') && // env var name reference
          val.length > 20
        ) {
          warnings.push(
            `Config property "${key}" may contain a secret value. Store credentials in .env instead of .solarch/project.json.`
          )
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
