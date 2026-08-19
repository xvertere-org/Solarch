/**
 * Template and Preset Validator.
 */

import { TemplateDefinition } from './types.js'

export function validateTemplate(template: TemplateDefinition): string[] {
  const errors: string[] = []

  if (!template.name || typeof template.name !== 'string') {
    errors.push('Template name is required')
  }

  if (!template.title || typeof template.title !== 'string') {
    errors.push('Template title is required')
  }

  if (!template.migrations || !Array.isArray(template.migrations) || template.migrations.length === 0) {
    errors.push('Template must provide at least one migration')
  } else {
    for (const m of template.migrations) {
      if (!m.file || !/^\d{3}_[a-zA-Z0-9_-]+\.js$/.test(m.file)) {
        errors.push(`Invalid migration filename in template: ${m.file}. Must match 000_name.js`)
      }
      if (!m.content || !m.content.includes('async up(') || !m.content.includes('async down(')) {
        errors.push(`Migration ${m.file} must include both async up(app) and async down(app) handlers`)
      }
    }
  }

  if (template.hooks && Array.isArray(template.hooks)) {
    for (const h of template.hooks) {
      if (!h.file || (!h.file.endsWith('.ts') && !h.file.endsWith('.js'))) {
        errors.push(`Invalid hook filename in template: ${h.file}. Must end in .ts or .js`)
      }
    }
  }

  return errors
}
