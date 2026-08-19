import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  loadTemplate,
  loadPreset,
  listTemplates,
  listPresets,
} from '../index.js'

describe('Template Loader & Registry', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-tpl-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. lists all standard templates and presets', () => {
    const templates = listTemplates()
    expect(templates.map(t => t.name)).toEqual(['minimal', 'api', 'realtime', 'saas', 'ai'])

    const presets = listPresets()
    expect(presets.map(p => p.name)).toEqual(['development', 'production', 'testing'])
  })

  it('2. loads built-in templates by name', () => {
    const saas = loadTemplate('saas')
    expect(saas.name).toBe('saas')
    expect(saas.title).toBe('SaaS Application')
    expect(saas.migrations.length).toBe(3)
    expect(saas.hooks?.length).toBe(1)

    const api = loadTemplate('api')
    expect(api.name).toBe('api')
    expect(api.migrations.length).toBe(2)
  })

  it('3. loads presets by name', () => {
    const prod = loadPreset('production')
    expect(prod.database).toBe('postgres')
    expect(prod.rateLimit).toBe(true)

    const dev = loadPreset('development')
    expect(dev.database).toBe('sqlite')
  })

  it('4. loads custom template from folder with template.json', () => {
    const customJson = {
      name: 'custom-tpl',
      title: 'Custom Template',
      description: 'My custom stack',
      features: { auth: ['email'] },
      migrations: [
        {
          file: '001_custom.js',
          name: 'custom',
          content: 'module.exports = { async up(app) {}, async down(app) {} }',
        },
      ],
    }

    fs.writeFileSync(path.join(tempDir, 'template.json'), JSON.stringify(customJson))

    const loaded = loadTemplate(tempDir)
    expect(loaded.name).toBe('custom-tpl')
    expect(loaded.title).toBe('Custom Template')
  })

  it('5. throws error for unknown template or preset', () => {
    expect(() => loadTemplate('unknown-template-xyz')).toThrow('Unknown template')
    expect(() => loadPreset('unknown-preset-xyz')).toThrow('Unknown preset')
  })
})
