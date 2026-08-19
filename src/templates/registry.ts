/**
 * Registry for Solarch Templates and Configuration Presets.
 */

import { TemplateDefinition, PresetDefinition, PresetName } from './types.js'
import { STANDARD_TEMPLATES, STANDARD_PRESETS } from './definitions.js'

export function getTemplate(name: string): TemplateDefinition | undefined {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase()
  return STANDARD_TEMPLATES[normalized]
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(STANDARD_TEMPLATES)
}

export function getPreset(name: string): PresetDefinition | undefined {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase() as PresetName
  return STANDARD_PRESETS[normalized]
}

export function listPresets(): PresetDefinition[] {
  return Object.values(STANDARD_PRESETS)
}
