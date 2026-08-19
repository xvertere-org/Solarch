/**
 * Types and interfaces for the Solarch CLI Environment Management subcommands.
 */

export interface BaseEnvOptions {
  dir?: string
  json?: boolean
  silent?: boolean
  exitOnComplete?: boolean
}

export type EnvCheckOptions = BaseEnvOptions

export interface EnvCheckItem {
  id: string
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export interface EnvCheckReport {
  timestamp: string
  valid: boolean
  checks: EnvCheckItem[]
}

export interface EnvGenerateOptions extends BaseEnvOptions {
  force?: boolean
  yes?: boolean
}

export interface EnvGenerateResult {
  updated: boolean
  envPath: string
  generatedKeys: string[]
  skippedKeys: string[]
  overwritten: boolean
}

export type EnvShowOptions = BaseEnvOptions

export interface EnvShowItem {
  key: string
  value: string
  isSecret: boolean
}

export interface EnvShowResult {
  envPath?: string
  variables: Record<string, string>
  items: EnvShowItem[]
}
