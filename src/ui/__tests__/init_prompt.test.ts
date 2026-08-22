import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promptInit } from '../prompts/init.js'
import * as textModule from '../prompts/text.js'
import * as selectModule from '../prompts/select.js'
import * as multiselectModule from '../prompts/multiselect.js'

describe('Solarch Init TUI Prompt Flow (Phase 1 & Platform Alignment)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Collects full project configuration interactively via ecosystem decision flow', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('api')     // 1. Application Type
      .mockResolvedValueOnce('local')   // 3. Deployment Model
      .mockResolvedValueOnce('sqlite')  // 4. Database Engine
      .mockResolvedValueOnce('none')    // 10. Plugin mode

    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('my-custom-app') // 2. Project Name
    vi.spyOn(multiselectModule, 'promptMultiSelect')
      .mockResolvedValueOnce(['auth'])           // 7. Capabilities
      .mockResolvedValueOnce(['solarch-web'])    // 8. SDKs

    const config = await promptInit()

    expect(config.name).toBe('my-custom-app')
    expect(config.database).toBe('sqlite')
    expect(config.plan).toBeDefined()
    expect(config.plan?.intent.application).toBe('api')
    expect(config.plan?.intent.deployment).toBe('local')
    expect(config.plan?.database.engine).toBe('sqlite')
    expect(config.plan?.sdks.selected).toEqual(['solarch-web'])
    expect(config.plan?.plugins.mode).toBe('none')
  })

  it('2. Prompts desktop runtime and database setup when selected', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('desktop')   // 1. Application Type
      .mockResolvedValueOnce('local')     // 3. Deployment Model
      .mockResolvedValueOnce('sqlite')    // 4. Database Engine
      .mockResolvedValueOnce('electron')  // 6. Desktop runtime
      .mockResolvedValueOnce('none')      // 10. Plugin mode

    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('desktop-app')
    vi.spyOn(multiselectModule, 'promptMultiSelect')
      .mockResolvedValueOnce(['auth'])               // 7. Capabilities
      .mockResolvedValueOnce(['solarch-electron'])   // 8. SDKs

    const config = await promptInit()

    expect(config.name).toBe('desktop-app')
    expect(config.desktopRuntime).toBe('electron')
    expect(config.plan?.desktop.runtime).toBe('electron')
    expect(config.plan?.sdks.selected).toEqual(['solarch-electron'])
  })

  it('3. Supports database setup and plugin selection when platform options are selected', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('saas')       // 1. Application Type
      .mockResolvedValueOnce('cloud')      // 3. Deployment Model
      .mockResolvedValueOnce('postgres')   // 4. Database Engine
      .mockResolvedValueOnce('local')      // 5. Database Setup
      .mockResolvedValueOnce('selected')   // 10. Plugin mode

    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('saas-enterprise')
    vi.spyOn(multiselectModule, 'promptMultiSelect')
      .mockResolvedValueOnce(['auth', 'payments'])      // 7. Capabilities
      .mockResolvedValueOnce(['solarch-web'])           // 8. SDKs
      .mockResolvedValueOnce(['stripe', 'resend'])      // 10b. Plugins

    const config = await promptInit()

    expect(config.name).toBe('saas-enterprise')
    expect(config.database).toBe('postgres')
    expect(config.dbSetup).toBe('local')
    expect(config.plan?.plugins.mode).toBe('selected')
    expect(config.plan?.plugins.plugins).toEqual(['stripe', 'resend'])
  })

  it('4. Uses provided initial values when passed in options', async () => {
    vi.spyOn(selectModule, 'promptSelect')
      .mockResolvedValueOnce('api')     // Application Type
      .mockResolvedValueOnce('local')   // Deployment Model
      .mockResolvedValueOnce('sqlite')  // Database Engine
      .mockResolvedValueOnce('none')    // Plugin mode

    vi.spyOn(textModule, 'promptText').mockResolvedValueOnce('seeded-app')
    vi.spyOn(multiselectModule, 'promptMultiSelect')
      .mockResolvedValueOnce(['auth'])
      .mockResolvedValueOnce([])

    const config = await promptInit({
      initialValues: {
        name: 'seeded-app',
        database: 'sqlite',
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

  it('5. Handles custom onCancel callback without throwing', async () => {
    const onCancel = vi.fn()
    vi.spyOn(selectModule, 'promptSelect').mockImplementationOnce(async (opts) => {
      opts.onCancel?.()
      return 'api'
    })

    await promptInit({ onCancel })
    expect(onCancel).toHaveBeenCalled()
  })
})
