/**
 * Type definitions for Solarch CLI Config Subcommands
 */

import { ResolvedAppConfig, SolarchConfigInput } from '../../core/config_types.js'

export interface BaseConfigOptions extends SolarchConfigInput {
  dir?: string
  json?: boolean
  exitOnComplete?: boolean
}

export type ConfigShowOptions = BaseConfigOptions

export interface ConfigShowReport {
  project: {
    name: string
    dir: string
    configFile?: string
  }
  runtime: {
    port: number
    dev: boolean
    dataDir: string
    queryTimeout: number
  }
  database: {
    provider: string
    driver?: string
    mode?: string
    url?: string
  }
  auth: {
    providers: string[]
  }
  features: {
    rateLimiting: boolean
    ai: boolean
  }
}

export type ConfigValidateOptions = BaseConfigOptions

export interface ConfigValidationCheck {
  id: string
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export interface ConfigValidateReport {
  timestamp: string
  valid: boolean
  checks: ConfigValidationCheck[]
}

export interface ConfigSetOptions {
  dir?: string
  key: string
  value: string
  exitOnComplete?: boolean
}

export interface ConfigSetResult {
  updated: boolean
  configFile: string
  key: string
  value: any
  manualUpdateRequired?: boolean
  message?: string
}
