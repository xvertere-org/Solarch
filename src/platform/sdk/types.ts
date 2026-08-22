/**
 * Solarch CLI SDK Provisioning & Package Types (Phase 3)
 */

export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface SdkRegistryEntry {
  name: string
  description: string
  recommendedFor: string[]
  category: 'web' | 'ai' | 'mobile' | 'desktop' | 'core'
  peerDependencies?: Record<string, string>
}

export interface SdkPackageInfo {
  name: string
  description: string
  category: string
  installed: boolean
  currentVersion?: string
  required: boolean
  recommendedFor: string[]
}

export interface SdkSyncPlan {
  packageManager: PackageManagerType
  toInstall: string[]
  toRemove: string[]
  alreadyInstalled: string[]
  isUpToDate: boolean
}
