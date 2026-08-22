/**
 * Solarch CLI Init Data Types & Options Contracts
 */

import { TemplateDefinition } from '../../templates/types.js'
import { DatabaseEngine, ProjectPlan, ApplicationType, DeploymentModel, DesktopRuntime } from '../../ecosystem/index.js'

export type DatabaseSetupMode = 'local' | 'linked' | 'later'

export interface InitConfig {
  name: string
  database: DatabaseEngine
  databaseUrl?: string
  dbSetup?: DatabaseSetupMode
  capabilities?: string[]
  authProviders: string[]
  rateLimit: boolean
  ai: boolean
  force?: boolean
  dir?: string
  template?: TemplateDefinition
  dryRun?: boolean
  plan?: ProjectPlan
  deployment?: DeploymentModel
  desktopRuntime?: DesktopRuntime
  sdks?: string[]
  plugins?: string[]
}

export interface InitOptions {
  dir?: string
  yes?: boolean
  name?: string
  db?: string
  dbUrl?: string
  dbSetup?: DatabaseSetupMode
  capabilities?: string | string[]
  auth?: string | string[]
  rateLimit?: boolean | string
  ai?: boolean | string
  template?: string
  preset?: string
  dryRun?: boolean
  force?: boolean
  exitOnComplete?: boolean
  app?: ApplicationType
  deployment?: DeploymentModel
  desktopRuntime?: DesktopRuntime
  sdks?: string | string[]
  plugins?: string | string[]
}

export interface GenerationResult {
  projectDir: string
  projectName: string
  database: DatabaseEngine
  dbSetup?: DatabaseSetupMode
  filesCreated: string[]
  dryRun?: boolean
  plan?: ProjectPlan
}
