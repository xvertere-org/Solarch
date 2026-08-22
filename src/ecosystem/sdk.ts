/**
 * Solarch CLI Ecosystem — SDK Capability & Metadata Contract (Phase 0 & Ecosystem Alignment)
 *
 * Defines machine-readable conceptual contracts describing isolated SDK packages.
 *
 * INVARIANT: The CLI must NEVER import SDK implementation code.
 * The CLI knows WHAT an SDK provides, not HOW the SDK implements it.
 */

import { ApplicationType, DesktopRuntime } from './intent.js'

export type SdkPlatform =
  | 'browser'
  | 'node'
  | 'react-native'
  | 'electron'
  | 'tauri'

export type SdkCapability =
  | 'auth'
  | 'realtime'
  | 'storage'
  | 'crud'
  | 'ai_chat'
  | 'vector_search'
  | 'offline_sync'
  | 'desktop_integration'

export interface SdkMetadata {
  packageName: string
  displayName: string
  description: string
  capabilities: SdkCapability[]
  supportedTargets: ApplicationType[]
  supportedPlatforms: SdkPlatform[]
  desktopRuntimes?: DesktopRuntime[]
  compatibilityRange: string
}

/**
 * Canonical ecosystem SDK metadata catalog.
 * Real published npm package descriptors.
 */
export const ECOSYSTEM_SDKS: Record<string, SdkMetadata> = {
  'solarch-web': {
    packageName: 'solarch-web',
    displayName: 'Solarch Web SDK',
    description: 'Official offline-first Web SDK with IndexedDB storage, mutation outbox, and React hooks.',
    capabilities: ['auth', 'realtime', 'storage', 'crud'],
    supportedTargets: ['web', 'saas', 'realtime', 'api', 'custom'],
    supportedPlatforms: ['browser'],
    compatibilityRange: '>=0.19.0',
  },
  'solarch-ai': {
    packageName: 'solarch-ai',
    displayName: 'Solarch AI SDK',
    description: 'Developer SDK for building AI-powered applications, streaming chat completions, and vector workflows.',
    capabilities: ['ai_chat', 'vector_search', 'auth', 'crud'],
    supportedTargets: ['ai', 'agent', 'web', 'api', 'custom'],
    supportedPlatforms: ['browser', 'node'],
    compatibilityRange: '>=0.19.0',
  },
  'solarch-rn': {
    packageName: 'solarch-rn',
    displayName: 'Solarch React Native SDK',
    description: 'Mobile client for React Native & Expo with native storage and offline sync.',
    capabilities: ['auth', 'realtime', 'storage', 'crud', 'offline_sync'],
    supportedTargets: ['mobile', 'custom'],
    supportedPlatforms: ['react-native'],
    compatibilityRange: '>=0.19.0',
  },
  'solarch-electron': {
    packageName: 'solarch-electron',
    displayName: 'Solarch Electron SDK',
    description: 'Electron desktop runtime SDK with IPC bridge and local storage.',
    capabilities: ['auth', 'realtime', 'storage', 'crud', 'desktop_integration'],
    supportedTargets: ['desktop', 'custom'],
    supportedPlatforms: ['electron'],
    desktopRuntimes: ['electron'],
    compatibilityRange: '>=0.19.0',
  },
  'solarch-tauri': {
    packageName: 'solarch-tauri',
    displayName: 'Solarch Tauri SDK',
    description: 'Tauri desktop runtime SDK with native Rust bridge.',
    capabilities: ['auth', 'realtime', 'storage', 'crud', 'desktop_integration'],
    supportedTargets: ['desktop', 'custom'],
    supportedPlatforms: ['tauri'],
    desktopRuntimes: ['tauri'],
    compatibilityRange: '>=0.19.0',
  },
}

// Alias mapping for flexible lookup
const ALIAS_MAP: Record<string, string> = {
  '@solarch/web': 'solarch-web',
  'web': 'solarch-web',
  '@solarch/ai': 'solarch-ai',
  'ai': 'solarch-ai',
  '@solarch/react-native': 'solarch-rn',
  'react-native': 'solarch-rn',
  'mobile': 'solarch-rn',
  'rn': 'solarch-rn',
  '@solarch/desktop': 'solarch-electron',
  'electron': 'solarch-electron',
  'solarch-desktop': 'solarch-electron',
  'tauri': 'solarch-tauri',
}

/**
 * Returns metadata for a known ecosystem SDK package name or alias.
 */
export function getSdkMetadata(packageName: string): SdkMetadata | undefined {
  if (ECOSYSTEM_SDKS[packageName]) return ECOSYSTEM_SDKS[packageName]
  const canonical = ALIAS_MAP[packageName]
  return canonical ? ECOSYSTEM_SDKS[canonical] : undefined
}

/**
 * Lists all registered ecosystem SDKs.
 */
export function listEcosystemSdks(): SdkMetadata[] {
  return Object.values(ECOSYSTEM_SDKS)
}
