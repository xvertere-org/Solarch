/**
 * Solarch Platform Extensible Capability Schema (Phase 4)
 */

export type CapabilityId =
  | 'auth'
  | 'realtime'
  | 'ai'
  | 'storage'
  | 'database'
  | (string & {})

export interface CapabilityDefinition<TConfig = Record<string, any>> {
  enabled: boolean
  version?: string
  config?: TConfig
}

export interface AuthCapabilityConfig {
  providers: string[]
  mfa: boolean
  passwordPolicy?: {
    minLength: number
    requireNumbers?: boolean
    requireSymbols?: boolean
  }
}

export interface RealtimeCapabilityConfig {
  transports: ('websocket' | 'sse')[]
  presence?: boolean
  cluster?: boolean
}

export interface AiCapabilityConfig {
  vectorSearch: boolean
  models: string[]
  dimensions?: number
  defaultProvider?: string
}

export interface StorageCapabilityConfig {
  provider: 's3' | 'r2' | 'gcs' | 'local' | (string & {})
  bucket?: string
  maxSizeBytes?: number
}

export interface DatabaseCapabilityConfig {
  engine: 'sqlite' | 'postgres' | 'mongodb'
  provider: 'local' | 'neon' | 'supabase' | 'atlas' | 'custom' | (string & {})
  vectorExtension?: boolean
  replication?: boolean
}

export type CapabilityMap = Record<string, CapabilityDefinition>
