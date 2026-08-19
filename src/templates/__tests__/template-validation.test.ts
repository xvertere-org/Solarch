import { describe, it, expect } from 'vitest'
import { validateTemplate } from '../validator.js'
import { TemplateDefinition } from '../types.js'

describe('Template Validation', () => {
  it('1. validates standard built-in templates with 0 errors', () => {
    const validTpl: TemplateDefinition = {
      name: 'test-api',
      title: 'Test API',
      description: 'A test template',
      features: { auth: ['email'] },
      migrations: [
        {
          file: '001_initial.js',
          name: 'initial',
          content: 'module.exports = { async up(app) {}, async down(app) {} }',
        },
      ],
      hooks: [
        {
          file: 'test.ts',
          name: 'test',
          content: 'export default async function hook() {}',
        },
      ],
    }

    const errors = validateTemplate(validTpl)
    expect(errors.length).toBe(0)
  })

  it('2. detects missing or invalid fields in template', () => {
    const invalidTpl: any = {
      name: '',
      title: '',
      features: {},
      migrations: [
        {
          file: 'bad_name.js',
          content: 'invalid content',
        },
      ],
      hooks: [
        {
          file: 'invalid_hook.txt',
          content: '',
        },
      ],
    }

    const errors = validateTemplate(invalidTpl)
    expect(errors.length).toBeGreaterThanOrEqual(3)
    expect(errors.some(e => e.includes('Template name'))).toBe(true)
    expect(errors.some(e => e.includes('Invalid migration filename'))).toBe(true)
    expect(errors.some(e => e.includes('Invalid hook filename'))).toBe(true)
  })
})
