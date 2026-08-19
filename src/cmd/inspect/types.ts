/**
 * Types and interfaces for the Solarch CLI Inspect subcommands.
 */

export interface BaseInspectOptions {
  dir?: string
  json?: boolean
  exitOnComplete?: boolean
}

export interface ProjectInspectReport {
  projectName: string
  solarchVersion: string
  configFile: string
  nodeVersion: string
  platform: string
  environment: string
  projectDir: string
}

export interface DatabaseInspectReport {
  provider: string
  driver: string
  mode: string
  status: string
  storage?: string
  host?: string
  database?: string
  url?: string
  capabilities: string[]
}

export interface FeaturesInspectReport {
  auth: {
    providers: string[]
  }
  storage: {
    type: string
    enabled: boolean
  }
  realtime: {
    enabled: boolean
  }
  ai: {
    enabled: boolean
  }
  hooks: {
    enabled: boolean
  }
  rateLimiting: {
    enabled: boolean
  }
}

export interface DependencyItem {
  name: string
  version?: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export interface DependenciesInspectReport {
  node: {
    version: string
    compatible: boolean
  }
  solarch: {
    version: string
  }
  databaseDriver: {
    name: string
    available: boolean
  }
  coreClient: {
    available: boolean
    version?: string
  }
  overallCompatible: boolean
}
