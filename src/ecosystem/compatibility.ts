/**
 * Solarch CLI Ecosystem — Compatibility & Version Model (Phase 0)
 *
 * Defines version compatibility resolution between Solarch CLI/runtime and SDKs.
 * Implemented in pure TypeScript without external runtime type dependencies.
 */

import { SdkMetadata } from './sdk'

export interface CompatibilityCheckResult {
  compatible: boolean
  runtimeVersion: string
  packageName: string
  requiredRange: string
  message?: string
}

export class CompatibilityModel {
  /**
   * Parses a semver string (e.g., "0.19.8", "v0.19.8") into [major, minor, patch].
   */
  public static parseVersion(version: string): [number, number, number] | null {
    const cleaned = version.replace(/^[v^~>=<\s]+/, '').trim()
    const parts = cleaned.split('.').map(p => parseInt(p, 10))
    if (parts.length < 2 || parts.some(isNaN)) {
      return null
    }
    return [parts[0], parts[1], parts[2] || 0]
  }

  /**
   * Compares two semver tuples: returns 1 if a > b, -1 if a < b, 0 if equal.
   */
  public static compare(a: [number, number, number], b: [number, number, number]): number {
    for (let i = 0; i < 3; i++) {
      if (a[i] > b[i]) return 1
      if (a[i] < b[i]) return -1
    }
    return 0
  }

  /**
   * Evaluates if a given SDK package metadata is compatible with the specified runtime version.
   * Supports standard basic ranges: ">=0.19.0", "^0.19.0", ">=0.18.0", etc.
   */
  public static checkSdkCompatibility(
    sdk: SdkMetadata,
    runtimeVersion: string
  ): CompatibilityCheckResult {
    const parsedRuntime = CompatibilityModel.parseVersion(runtimeVersion)

    if (!parsedRuntime) {
      return {
        compatible: false,
        runtimeVersion,
        packageName: sdk.packageName,
        requiredRange: sdk.compatibilityRange,
        message: `Invalid or unparseable runtime version: "${runtimeVersion}"`,
      }
    }

    let isSatisfied = true
    const range = sdk.compatibilityRange.trim()

    if (range.startsWith('>=')) {
      const minVer = CompatibilityModel.parseVersion(range)
      if (minVer) {
        isSatisfied = CompatibilityModel.compare(parsedRuntime, minVer) >= 0
      }
    } else if (range.startsWith('>')) {
      const minVer = CompatibilityModel.parseVersion(range)
      if (minVer) {
        isSatisfied = CompatibilityModel.compare(parsedRuntime, minVer) > 0
      }
    } else if (range.startsWith('^')) {
      const baseVer = CompatibilityModel.parseVersion(range)
      if (baseVer) {
        // Same major (or if major is 0, same minor)
        if (baseVer[0] === 0) {
          isSatisfied = parsedRuntime[0] === 0 && parsedRuntime[1] >= baseVer[1]
        } else {
          isSatisfied = parsedRuntime[0] === baseVer[0] && CompatibilityModel.compare(parsedRuntime, baseVer) >= 0
        }
      }
    }

    const cleanRuntimeStr = parsedRuntime.join('.')

    return {
      compatible: isSatisfied,
      runtimeVersion: cleanRuntimeStr,
      packageName: sdk.packageName,
      requiredRange: sdk.compatibilityRange,
      message: isSatisfied
        ? `SDK ${sdk.packageName} is fully compatible with Solarch runtime ${cleanRuntimeStr}.`
        : `SDK ${sdk.packageName} requires Solarch runtime ${sdk.compatibilityRange}, but found ${cleanRuntimeStr}.`,
    }
  }
}
