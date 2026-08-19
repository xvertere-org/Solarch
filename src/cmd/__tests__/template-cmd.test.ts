import { describe, it, expect } from 'vitest'
import { runTemplateList, runTemplateInfo } from '../template/index.js'

describe('solarch template CLI Commands', () => {
  it('1. lists all available templates as JSON', async () => {
    const list = await runTemplateList({
      json: true,
      exitOnComplete: false,
    })

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(5)
    expect(list.map(t => t.name)).toContain('saas')
    expect(list.map(t => t.name)).toContain('api')
  })

  it('2. retrieves template info for saas', async () => {
    const info = await runTemplateInfo({
      name: 'saas',
      json: true,
      exitOnComplete: false,
    })

    expect(info.name).toBe('saas')
    expect(info.title).toBe('SaaS Application')
    expect(info.migrations.length).toBe(3)
    expect(info.hooks?.length).toBe(1)
  })

  it('3. rejects unknown template name in template info', async () => {
    await expect(
      runTemplateInfo({
        name: 'non-existent-template',
        json: true,
        exitOnComplete: false,
      })
    ).rejects.toThrow('Unknown template')
  })
})
