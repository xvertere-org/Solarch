/**
 * Configuration schema and types for Solarch.
 * Defines the unified internal configuration contract (ResolvedAppConfig)
 * and the input formats from CLI, environment, config file, and code.
 */

export type DatabaseProviderType = 'sqlite' | 'postgres' | 'mongodb'

export interface ResolvedDatabaseConfig {
  provider: DatabaseProviderType
  connectionString?: string
  database?: string
  driver?: 'postgres' | 'neon'
  mode?: 'tcp' | 'http' | 'websocket'
  queryTimeout: number
  pool?: {
    max?: number
    min?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
  }
}

export interface ResolvedAppConfig {
  db: ResolvedDatabaseConfig
  dataDir: string
  isDev: boolean
  encryptionEnv: string
  hideStartBanner: boolean
  queryTimeout: number
  dataMaxOpenConns?: number
  dataMaxIdleConns?: number
  auxMaxOpenConns?: number
  auxMaxIdleConns?: number
}

export interface SolarchConfigInput {
  hideStartBanner?: boolean
  defaultDev?: boolean
  isDev?: boolean
  defaultDataDir?: string
  dataDir?: string
  defaultEncryptionEnv?: string
  encryptionEnv?: string
  defaultQueryTimeout?: number
  queryTimeout?: number
  dataMaxOpenConns?: number
  dataMaxIdleConns?: number
  auxMaxOpenConns?: number
  auxMaxIdleConns?: number
  dbProvider?: DatabaseProviderType
  provider?: DatabaseProviderType
  connectionString?: string
  database?: string
  dbUrl?: string
  databaseUrl?: string
  dbDriver?: 'postgres' | 'neon'
  driver?: 'postgres' | 'neon'
  dbMode?: 'tcp' | 'http' | 'websocket'
  mode?: 'tcp' | 'http' | 'websocket'
  db?: Partial<ResolvedDatabaseConfig>
  pool?: {
    max?: number
    min?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
  }
}

export interface ConfigFileSchema {
  port?: number
  dataDir?: string
  dev?: boolean
  queryTimeout?: number
  encryptionEnv?: string
  database?: {
    type?: DatabaseProviderType
    url?: string
    driver?: 'postgres' | 'neon'
    mode?: 'tcp' | 'http' | 'websocket'
    pool?: {
      max?: number
      idleTimeoutMs?: number
      connectionTimeoutMs?: number
    }
  }
  auth?: {
    providers?: string[]
  }
  rateLimiting?: {
    enabled?: boolean
  }
  ai?: {
    enabled?: boolean
  }
}
