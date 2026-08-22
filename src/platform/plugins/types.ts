/**
 * Solarch Platform Plugin Ecosystem Types (Phase 5 & 5.1)
 */

export type PluginSource = 'official' | 'community' | 'local'
export type PluginCategory = 'auth' | 'storage' | 'billing' | 'monitoring' | 'ai' | 'utilities'
export type PluginHookType = 'onInit' | 'onRequest' | 'onAuth' | 'onMigration' | 'onShutdown'

export interface PluginEnvironmentRequirement {
  key: string
  description: string
  secret: boolean
  optional?: boolean
  default?: string
}

export interface PluginInitContext {
  projectDir: string
  environment: string
  config: Record<string, any>
}

export interface PluginAuthContext {
  provider: string
  identity: Record<string, any>
}

export interface PluginRequestContext {
  method: string
  path: string
  headers: Record<string, string>
}

export interface PluginMigrationContext {
  databaseEngine: string
  appliedVersions: string[]
}

export interface PluginHooks {
  onInit?(ctx: PluginInitContext): Promise<void> | void
  onRequest?(ctx: PluginRequestContext): Promise<void> | void
  onAuth?(ctx: PluginAuthContext): Promise<void> | void
  onMigration?(ctx: PluginMigrationContext): Promise<void> | void
  onShutdown?(): Promise<void> | void
}

export interface PluginModule {
  default?: PluginHooks | ((options?: Record<string, any>) => PluginHooks)
  hooks?: PluginHooks
}

export interface PluginDescriptor {
  id: string
  name: string
  title: string
  description: string
  category: PluginCategory
  source: PluginSource
  publisher: string
  version?: string
  requiresCapabilities?: Record<string, any>
  requiresPlugins?: string[]
  requiresSdks?: string[]
  conflictsWith?: string[]
  configSchema?: Record<string, any>
  defaultConfig?: Record<string, any>
  environmentRequirements: PluginEnvironmentRequirement[]
  hooks: PluginHookType[]
}

export interface PluginSelection {
  id: string
  name: string
  version?: string
  enabled: boolean
  source: PluginSource
  config: Record<string, any>
  secretRefs?: Record<string, string>
}

export interface PluginValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface LoadedPlugin {
  descriptor: PluginDescriptor
  hooks: PluginHooks
  state: 'initialized' | 'error' | 'stopped'
  error?: string
}

export interface PluginLoaderOptions {
  projectDir: string
  environment?: string
  timeoutMs?: number
  logger?: {
    info(msg: string): void
    warn(msg: string): void
    error(msg: string, err?: any): void
  }
}
