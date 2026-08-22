/**
 * Solarch CLI Project Configuration Synchronization Types (Phase 3)
 */

export type EnvironmentTarget = 'development' | 'staging' | 'production'

export interface ProjectConfigPayload {
  projectId: string
  orgId: string
  name: string
  environment: EnvironmentTarget
  envVars: Record<string, string>
  plugins?: {
    mode: string
    list: string[]
  }
  requiredSdks?: string[]
  settings?: Record<string, any>
}

export interface SyncOptions {
  environment?: EnvironmentTarget
  dryRun?: boolean
  force?: boolean
  dir?: string
  token?: string
}

export interface EnvMergeResult {
  content: string
  added: string[]
  updated: string[]
  preserved: string[]
}

export interface SyncResult {
  projectId: string
  orgId: string
  environment: EnvironmentTarget
  envChanges: {
    added: string[]
    updated: string[]
    preserved: string[]
  }
  manifestUpdated: boolean
  missingSdks: string[]
  dryRun: boolean
}
