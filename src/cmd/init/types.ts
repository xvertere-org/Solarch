/**
 * Solarch CLI Init Data Types & Options Contracts
 */

import { TemplateDefinition } from '../../templates/types.js'

export interface InitConfig {
  name: string
  database: 'sqlite' | 'postgres'
  databaseUrl?: string
  authProviders: string[]
  rateLimit: boolean
  ai: boolean
  force?: boolean
  dir?: string
  template?: TemplateDefinition
  dryRun?: boolean
}

export interface InitOptions {
  dir?: string
  yes?: boolean
  name?: string
  db?: string
  dbUrl?: string
  auth?: string | string[]
  rateLimit?: boolean | string
  ai?: boolean | string
  template?: string
  preset?: string
  dryRun?: boolean
  force?: boolean
  exitOnComplete?: boolean
}

export interface GenerationResult {
  projectDir: string
  projectName: string
  database: 'sqlite' | 'postgres'
  filesCreated: string[]
  dryRun?: boolean
}
