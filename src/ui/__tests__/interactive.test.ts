import { describe, it, expect, vi } from 'vitest'
import { runInteractiveLauncher } from '../interactive'
import * as selectPrompt from '../prompts/select'

describe('Interactive Command Launcher', () => {
  it('1. returns user selection when valid option chosen', async () => {
    const selectSpy = vi.spyOn(selectPrompt, 'promptSelect').mockResolvedValue('dev')

    const choice = await runInteractiveLauncher()
    expect(choice).toBe('dev')
    expect(selectSpy).toHaveBeenCalledOnce()

    selectSpy.mockRestore()
  })

  it('2. returns null when cancelled by user', async () => {
    const cancelSymbol = Symbol('clack:cancel')
    const selectSpy = vi.spyOn(selectPrompt, 'promptSelect').mockResolvedValue(cancelSymbol as any)

    const choice = await runInteractiveLauncher()
    expect(choice).toBeNull()

    selectSpy.mockRestore()
  })
})
