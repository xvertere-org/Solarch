/**
 * Solarch Platform Environment Specification Schema (Phase 4)
 *
 * Defines environment configuration and variable definitions.
 * GUARANTEE: Contains variable names and metadata only; never stores secret values.
 */

export interface VariableDefinition {
  key: string
  description?: string
  required?: boolean
  defaultValue?: string
}

export interface EnvironmentSpec {
  name: 'development' | 'staging' | 'production' | (string & {})
  variables: VariableDefinition[]
  secretNames: string[]
  hostname?: string
  region?: string
}
