/**
 * Solarch Canonical SDK Catalog & Package Contract
 *
 * Single source of truth for independently published Solarch ecosystem SDK packages.
 *
 * INVARIANT: The CLI does NOT define SDK identities or contain SDK implementations.
 * SDK packages define themselves; the CLI only discovers, recommends, and installs them.
 */

export interface SolarchSdkPackage {
  name: string
  npmPackage: string
  version?: string
  category: 'web' | 'mobile' | 'desktop' | 'application-ai' | 'core'
  description: string
  capabilities: string[]
  runtimes?: string[]
}

export const SOLARCH_SDK_CATALOG: SolarchSdkPackage[] = [
  {
    name: 'web',
    npmPackage: 'solarch-web',
    category: 'web',
    description: 'Official offline-first Web SDK with IndexedDB storage, mutation outbox, and React hooks',
    capabilities: ['offline-storage', 'sync', 'react-hooks', 'auth', 'realtime'],
    runtimes: ['browser'],
  },
  {
    name: 'react-native',
    npmPackage: 'solarch-rn',
    category: 'mobile',
    description: 'Mobile platform ergonomics layer for React Native & Expo with native storage and sync',
    capabilities: ['native-storage', 'offline-sync', 'auth', 'realtime'],
    runtimes: ['react-native'],
  },
  {
    name: 'electron',
    npmPackage: 'solarch-electron',
    category: 'desktop',
    description: 'Electron desktop runtime SDK with IPC bridge and persistent local cache',
    capabilities: ['desktop-integration', 'ipc-bridge', 'auth', 'offline-storage'],
    runtimes: ['electron'],
  },
  {
    name: 'tauri',
    npmPackage: 'solarch-tauri',
    category: 'desktop',
    description: 'Tauri desktop runtime SDK with native Rust bridge and lightweight storage',
    capabilities: ['desktop-integration', 'tauri-bridge', 'auth', 'offline-storage'],
    runtimes: ['tauri'],
  },
  {
    name: 'ai',
    npmPackage: 'solarch-ai',
    category: 'application-ai',
    description: 'Developer SDK for building AI-powered applications, streaming chat, and vector workflows',
    capabilities: ['agent-development', 'ai-workflows', 'vector-search', 'streaming-chat'],
    runtimes: ['browser', 'node'],
  },
]

export class SdkCatalog {
  public static getAll(): SolarchSdkPackage[] {
    return [...SOLARCH_SDK_CATALOG]
  }

  /**
   * Resolves a package by short name (e.g. "web", "mobile", "rn", "electron", "tauri", "ai")
   * or by full published npm package name (e.g. "solarch-web", "solarch-rn", "solarch-ai").
   */
  public static resolve(input: string): SolarchSdkPackage | undefined {
    const normalized = input.trim().toLowerCase()

    // 1. Direct npm package match
    const byNpm = SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === normalized)
    if (byNpm) return byNpm

    // 2. Direct short name match
    const byName = SOLARCH_SDK_CATALOG.find((p) => p.name === normalized)
    if (byName) return byName

    // 3. Aliases
    if (normalized === 'rn' || normalized === 'mobile') {
      return SOLARCH_SDK_CATALOG.find((p) => p.name === 'react-native')
    }
    if (normalized === 'desktop') {
      return SOLARCH_SDK_CATALOG.find((p) => p.name === 'electron')
    }

    // 4. Backward compatibility legacy prefix resolution (@solarch/web -> solarch-web)
    if (normalized.startsWith('@solarch/')) {
      const bare = normalized.replace('@solarch/', '')
      if (bare === 'web') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-web')
      if (bare === 'react-native' || bare === 'rn') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-rn')
      if (bare === 'electron') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-electron')
      if (bare === 'tauri') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-tauri')
      if (bare === 'ai') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-ai')
      if (bare === 'desktop') return SOLARCH_SDK_CATALOG.find((p) => p.npmPackage === 'solarch-electron')
    }

    return undefined
  }

  /**
   * Recommends SDK packages based on application intent and runtime parameters.
   */
  public static recommend(intent: {
    applicationType?: string
    desktopRuntime?: string
    isAiApplication?: boolean
  }): SolarchSdkPackage[] {
    const recs: SolarchSdkPackage[] = []

    if (intent.applicationType === 'web' || intent.applicationType === 'saas' || intent.applicationType === 'realtime') {
      const web = SdkCatalog.resolve('solarch-web')
      if (web) recs.push(web)
    } else if (intent.applicationType === 'mobile') {
      const rn = SdkCatalog.resolve('solarch-rn')
      if (rn) recs.push(rn)
    } else if (intent.applicationType === 'desktop') {
      if (intent.desktopRuntime === 'tauri') {
        const tauri = SdkCatalog.resolve('solarch-tauri')
        if (tauri) recs.push(tauri)
      } else {
        const electron = SdkCatalog.resolve('solarch-electron')
        if (electron) recs.push(electron)
      }
    }

    if (intent.isAiApplication || intent.applicationType === 'ai' || intent.applicationType === 'agent') {
      const ai = SdkCatalog.resolve('solarch-ai')
      if (ai && !recs.includes(ai)) recs.push(ai)
    }

    return recs
  }
}
