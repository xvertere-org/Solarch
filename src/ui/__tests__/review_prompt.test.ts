import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promptReview } from '../prompts/review'
import * as confirmModule from '../prompts/confirm'
import * as clack from '@clack/prompts'
import { InitConfig } from '../../cmd/init/types'
import { ProjectPlan, ProjectIntent, DatabaseStrategy, SdkSelection, PluginSelection } from '../../ecosystem'

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts')
  return {
    ...actual,
    note: vi.fn(),
    cancel: vi.fn(),
  }
})

describe('Solarch Init Review Step (src/ui/prompts/review.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const sampleConfig: InitConfig = {
    name: 'backend-api',
    database: 'sqlite',
    authProviders: ['email', 'github'],
    rateLimit: true,
    ai: false,
    dir: '.',
  }

  it('renders review summary card with note() and returns true when accepted', async () => {
    vi.spyOn(confirmModule, 'promptConfirm').mockResolvedValueOnce(true)

    const confirmed = await promptReview(sampleConfig)

    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('backend-api'),
      'Solarch Project Plan'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('SQLite'),
      'Solarch Project Plan'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('Email, Github'),
      'Solarch Project Plan'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('Rate Limiting'),
      'Solarch Project Plan'
    )
    expect(confirmModule.promptConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Create this project?',
        initialValue: true,
      })
    )
    expect(confirmed).toBe(true)
  })

  it('renders full ecosystem ProjectPlan review summary card when plan is present', async () => {
    vi.spyOn(confirmModule, 'promptConfirm').mockResolvedValueOnce(true)

    const plan = new ProjectPlan({
      identity: { name: 'ai-enterprise-app', dir: '.' },
      intent: new ProjectIntent({ application: 'ai', deployment: 'cloud' }),
      database: new DatabaseStrategy({ engine: 'postgres', topology: 'postgres_only', capabilities: { vector: true }, source: 'recommendation' }),
      sdks: new SdkSelection({ selected: ['solarch-ai', 'solarch-web'], source: 'user' }),
      plugins: new PluginSelection({ mode: 'selected', plugins: ['stripe'] }),
    })

    const configWithPlan: InitConfig = {
      ...sampleConfig,
      name: 'ai-enterprise-app',
      plan,
    }

    const confirmed = await promptReview(configWithPlan)

    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('ai-enterprise-app'),
      'Solarch Project Plan'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('PostgreSQL (+ pgvector)'),
      'Solarch Project Plan'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('solarch-ai, solarch-web'),
      'Solarch Project Plan'
    )
    expect(confirmed).toBe(true)
  })

  it('handles review rejection (No) and triggers onCancel', async () => {
    const onCancel = vi.fn()
    vi.spyOn(confirmModule, 'promptConfirm').mockResolvedValueOnce(false)

    const confirmed = await promptReview(sampleConfig, { onCancel })

    expect(confirmed).toBe(false)
    expect(onCancel).toHaveBeenCalled()
  })

  it('handles cancellation event cleanly during review confirm prompt', async () => {
    const onCancel = vi.fn()
    vi.spyOn(confirmModule, 'promptConfirm').mockImplementationOnce(async (opts) => {
      opts.onCancel?.()
      return false
    })

    const confirmed = await promptReview(sampleConfig, { onCancel })

    expect(confirmed).toBe(false)
    expect(onCancel).toHaveBeenCalled()
  })
})
