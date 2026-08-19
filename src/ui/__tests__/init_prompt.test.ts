import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promptInit } from '../prompts/init.js'
import * as textModule from '../prompts/text.js'
import * as selectModule from '../prompts/select.js'
import * as multiselectModule from '../prompts/multiselect.js'
import * as confirmModule from '../prompts/confirm.js'

describe('Solarch Init TUI Prompt Flow (src/ui/prompts/init.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('collects default project configuration interactively via template', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('api')     // Template selection
      .mockResolvedValueOnce('sqlite')  // Database selection
    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('my-custom-app')

    const config = await promptInit()

    expect(config.name).toBe('my-custom-app')
    expect(config.database).toBe('sqlite')
    expect(config.template?.name).toBe('api')
    expect(config.authProviders).toContain('email')
    expect(config.rateLimit).toBe(true)

    expect(selectModule.promptSelect).toHaveBeenCalledTimes(2)
    expect(textModule.promptText).toHaveBeenCalledTimes(1)
  })

  it('prompts for PostgreSQL database URL when postgres is chosen', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('saas')       // Template selection
      .mockResolvedValueOnce('postgres')   // Database selection
    vi.spyOn(textModule, 'promptText')
      .mockResolvedValueOnce('enterprise-service')
      .mockResolvedValueOnce('postgres://admin:secret@localhost:5432/maindb')

    const config = await promptInit()

    expect(config.name).toBe('enterprise-service')
    expect(config.database).toBe('postgres')
    expect(config.databaseUrl).toBe('postgres://admin:secret@localhost:5432/maindb')
    expect(config.template?.name).toBe('saas')
    expect(config.authProviders).toEqual(['email', 'google', 'github'])

    expect(textModule.promptText).toHaveBeenCalledTimes(2)
  })

  it('allows custom stack configuration with multi-select and feature checkboxes', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('custom')     // Custom template
      .mockResolvedValueOnce('sqlite')     // Database selection
    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('custom-app')
    vi.spyOn(multiselectModule, 'promptMultiSelect').mockResolvedValueOnce(['email', 'discord'])
    vi.spyOn(confirmModule, 'promptConfirm')
      .mockResolvedValueOnce(true)   // rate limit
      .mockResolvedValueOnce(true)   // ai

    const config = await promptInit()

    expect(config.name).toBe('custom-app')
    expect(config.database).toBe('sqlite')
    expect(config.authProviders).toEqual(['email', 'discord'])
    expect(config.rateLimit).toBe(true)
    expect(config.ai).toBe(true)
  })

  it('uses provided initial values when passed in options', async () => {
    vi.spyOn(selectModule, 'promptSelect').mockResolvedValueOnce('sqlite')
    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('seeded-app')

    const config = await promptInit({
      initialValues: {
        name: 'seeded-app',
        database: 'sqlite',
        template: 'minimal',
        authProviders: ['email'],
        rateLimit: false,
        ai: false,
        force: true,
        dir: '/custom/path',
      },
    })

    expect(config.name).toBe('seeded-app')
    expect(config.force).toBe(true)
    expect(config.dir).toBe('/custom/path')
  })

  it('handles custom onCancel callback without throwing', async () => {
    const onCancel = vi.fn()
    vi.spyOn(selectModule, 'promptSelect').mockImplementationOnce(async (opts) => {
      opts.onCancel?.()
      return 'api'
    })

    await promptInit({ onCancel })
    expect(onCancel).toHaveBeenCalled()
  })
})
