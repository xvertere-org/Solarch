/**
 * Template Loader.
 */

import fs from 'fs'
import path from 'path'
import { TemplateDefinition, PresetDefinition } from './types.js'
import { getTemplate, getPreset } from './registry.js'
import { validateTemplate } from './validator.js'

export function loadTemplate(nameOrPath: string): TemplateDefinition {
  if (!nameOrPath) {
    throw new Error('Template name or path is required')
  }

  // 1. Check built-in registry
  const builtIn = getTemplate(nameOrPath)
  if (builtIn) {
    return builtIn
  }

  // 2. Check local directory path with template.json
  const resolved = path.resolve(nameOrPath)
  const templateJsonPath = path.join(resolved, 'template.json')

  if (fs.existsSync(templateJsonPath)) {
    try {
      const raw = fs.readFileSync(templateJsonPath, 'utf-8')
      const parsed: TemplateDefinition = JSON.parse(raw)
      const errors = validateTemplate(parsed)
      if (errors.length > 0) {
        throw new Error(`Invalid custom template definition: ${errors.join(', ')}`)
      }
      return parsed
    } catch (err: any) {
      throw new Error(`Failed to load template from "${templateJsonPath}": ${err.message}`)
    }
  }

  throw new Error(`Unknown template: "${nameOrPath}". Available templates: minimal, api, realtime, saas, ai`)
}

export function loadPreset(name: string): PresetDefinition {
  if (!name) {
    throw new Error('Preset name is required')
  }

  const preset = getPreset(name)
  if (!preset) {
    throw new Error(`Unknown preset: "${name}". Available presets: development, production, testing`)
  }

  return preset
}
