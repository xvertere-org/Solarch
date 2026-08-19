/**
 * Types and interfaces for the Solarch CLI Project Lifecycle subcommands.
 */

export interface BaseProjectOptions {
  dir?: string
  json?: boolean
  exitOnComplete?: boolean
}

export type ProjectPathOptions = BaseProjectOptions

export interface ProjectPathReport {
  projectDir: string
  configFile?: string
  dataDir: string
  migrationsDir: string
}

export interface ProjectCleanOptions extends BaseProjectOptions {
  yes?: boolean
}

export interface ProjectCleanResult {
  cleaned: boolean
  removedPaths: string[]
  skippedPaths: string[]
}

export interface ProjectResetOptions extends BaseProjectOptions {
  yes?: boolean
}

export interface ProjectResetResult {
  reset: boolean
  databaseRemoved: boolean
  runtimeRecreated: boolean
  doctorValidated: boolean
}
