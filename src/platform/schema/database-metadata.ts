/**
 * Solarch Platform Database Metadata Schema (Phase 4)
 *
 * Defines database engine and provider architecture without storing credentials or connection strings.
 */

export type DatabaseEngine = 'sqlite' | 'postgres' | 'mongodb'
export type DatabaseProvider = 'local' | 'neon' | 'supabase' | 'atlas' | 'custom' | (string & {})

export interface DatabaseMetadata {
  engine: DatabaseEngine
  provider: DatabaseProvider
  features: {
    vector: boolean
    wal?: boolean
    ssl?: boolean
    readReplicas?: number
  }
  resourceName?: string
}
