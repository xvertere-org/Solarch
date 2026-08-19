/**
 * Template Definition & Metadata Types for Solarch Template System.
 */

export interface TemplateMigration {
  file: string
  name: string
  content: string
}

export interface TemplateHook {
  file: string
  name: string
  content: string
}

export interface TemplateFeatures {
  auth: string[]
  rateLimit?: boolean
  realtime?: boolean
  ai?: boolean
  storage?: boolean
  webhooks?: boolean
}

export interface TemplateDefinition {
  name: string
  title: string
  description: string
  recommendedDatabase?: 'sqlite' | 'postgres'
  features: TemplateFeatures
  migrations: TemplateMigration[]
  hooks?: TemplateHook[]
  envVars?: Record<string, string>
  previewIncludes?: string[]
}

export type PresetName = 'development' | 'production' | 'testing'

export interface PresetDefinition {
  name: PresetName
  database: 'sqlite' | 'postgres'
  rateLimit: boolean
  ai: boolean
  description: string
}
