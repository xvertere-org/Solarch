/**
 * Solarch CLI SDK Registry (Phase 3 & Ecosystem Alignment)
 *
 * Canonical catalog of independently published Solarch client SDK packages.
 */

import { SdkRegistryEntry } from './types.js'
import { SdkCatalog, SOLARCH_SDK_CATALOG } from './catalog.js'

export const SDK_REGISTRY: Record<string, SdkRegistryEntry> = Object.fromEntries(
  SOLARCH_SDK_CATALOG.map((pkg) => [
    pkg.npmPackage,
    {
      name: pkg.npmPackage,
      description: pkg.description,
      recommendedFor: pkg.runtimes || [pkg.category],
      category: (pkg.category === 'application-ai' ? 'ai' : pkg.category) as SdkRegistryEntry['category'],
    },
  ])
)

export class SdkRegistry {
  public static getAll(): SdkRegistryEntry[] {
    return Object.values(SDK_REGISTRY)
  }

  public static get(name: string): SdkRegistryEntry | undefined {
    const resolved = SdkCatalog.resolve(name)
    if (!resolved) return undefined
    return SDK_REGISTRY[resolved.npmPackage]
  }

  public static getRecommendedFor(appType: string): SdkRegistryEntry[] {
    const recs = SdkCatalog.recommend({
      applicationType: appType,
      isAiApplication: appType === 'ai' || appType === 'agent',
    })
    return recs.map((r) => SDK_REGISTRY[r.npmPackage]).filter(Boolean)
  }

  public static normalizePackageName(name: string): string {
    const resolved = SdkCatalog.resolve(name)
    return resolved ? resolved.npmPackage : name
  }
}
