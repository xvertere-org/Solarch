/**
 * Types and interfaces for the Solarch CLI Template inspection commands.
 */

import { TemplateDefinition } from '../../templates/types.js'

export interface TemplateListOptions {
  json?: boolean
  exitOnComplete?: boolean
}

export interface TemplateInfoOptions {
  name: string
  json?: boolean
  exitOnComplete?: boolean
}

export interface TemplateSummary {
  name: string
  title: string
  description: string
  recommendedDatabase?: string
  previewIncludes?: string[]
}
