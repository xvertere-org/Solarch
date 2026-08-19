/**
 * Types and interfaces for the Solarch CLI Resource Generators.
 */

export interface GenerateOptions {
  name: string
  dir?: string
  force?: boolean
  json?: boolean
  exitOnComplete?: boolean
}

export interface GenerateResult {
  type: 'collection' | 'migration' | 'hook'
  name: string
  filePath: string
  created: boolean
}
