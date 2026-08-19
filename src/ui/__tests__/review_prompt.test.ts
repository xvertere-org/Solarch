import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promptReview } from '../prompts/review'
import * as confirmModule from '../prompts/confirm'
import * as clack from '@clack/prompts'
import { InitConfig } from '../../cmd/init/types'

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
      'Solarch Configuration'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('SQLite'),
      'Solarch Configuration'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('Email, Github'),
      'Solarch Configuration'
    )
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('Rate Limiting'),
      'Solarch Configuration'
    )
    expect(confirmModule.promptConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Create project?',
        initialValue: true,
      })
    )
    expect(confirmed).toBe(true)
  })

  it('handles review rejection (No) and triggers onCancel', async () => {
    vi.spyOn(confirmModule, 'promptConfirm').mockResolvedValueOnce(false)
    const onCancel = vi.fn()

    const confirmed = await promptReview(sampleConfig, { onCancel })

    expect(onCancel).toHaveBeenCalled()
    expect(confirmed).toBe(false)
  })

  it('handles cancellation event cleanly during review confirm prompt', async () => {
    const onCancel = vi.fn()
    vi.spyOn(confirmModule, 'promptConfirm').mockImplementationOnce(async (opts) => {
      opts.onCancel?.()
      return false
    })

    const confirmed = await promptReview(sampleConfig, { onCancel })

    expect(onCancel).toHaveBeenCalled()
    expect(confirmed).toBe(false)
  })
})
