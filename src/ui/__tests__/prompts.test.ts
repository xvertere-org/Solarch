import { describe, it, expect, vi } from 'vitest'
import {
  colors,
  symbols,
  formatStep,
  formatBadge,
  promptText,
  promptSelect,
  promptMultiSelect,
  promptConfirm,
  intro,
  outro,
  spinner,
  note,
  log,
} from '../index'
import * as clack from '@clack/prompts'

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts')
  return {
    ...actual,
    text: vi.fn(),
    select: vi.fn(),
    multiselect: vi.fn(),
    confirm: vi.fn(),
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    note: vi.fn(),
    isCancel: (val: any) => actual.isCancel(val) || typeof val === 'symbol',
  }
})

describe('Solarch TUI Layer & Prompts Abstraction', () => {
  it('exports all expected UI primitives and helpers', () => {
    expect(colors).toBeDefined()
    expect(symbols).toBeDefined()
    expect(typeof formatStep).toBe('function')
    expect(typeof formatBadge).toBe('function')
    expect(typeof promptText).toBe('function')
    expect(typeof promptSelect).toBe('function')
    expect(typeof promptMultiSelect).toBe('function')
    expect(typeof promptConfirm).toBe('function')
    expect(typeof intro).toBe('function')
    expect(typeof outro).toBe('function')
    expect(typeof spinner).toBe('function')
    expect(typeof note).toBe('function')
    expect(typeof log).toBe('object')
  })

  it('formats steps and badges with expected tokens', () => {
    const stepOutput = formatStep(1, 4, 'Database Selection')
    expect(stepOutput).toContain('[1/4]')
    expect(stepOutput).toContain('Database Selection')

    const successBadge = formatBadge('OK', 'success')
    expect(successBadge).toContain('OK')

    const warnBadge = formatBadge('WARN', 'warn')
    expect(warnBadge).toContain('WARN')
  })

  it('promptText delegates to clack and trims string output', async () => {
    vi.mocked(clack.text).mockResolvedValueOnce('  my-awesome-service  ' as any)

    const result = await promptText({
      message: 'Project name',
      defaultValue: 'my-app',
    })

    expect(clack.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Project name',
        defaultValue: 'my-app',
      })
    )
    expect(result).toBe('my-awesome-service')
  })

  it('promptSelect delegates to clack with options and returns selected value', async () => {
    vi.mocked(clack.select).mockResolvedValueOnce('postgres' as any)

    const result = await promptSelect({
      message: 'Choose database',
      options: [
        { value: 'sqlite', label: 'SQLite (default)' },
        { value: 'postgres', label: 'PostgreSQL' },
      ],
    })

    expect(clack.select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Choose database',
      })
    )
    expect(result).toBe('postgres')
  })

  it('promptMultiSelect delegates to clack and returns selected array', async () => {
    vi.mocked(clack.multiselect).mockResolvedValueOnce(['email', 'github'] as any)

    const result = await promptMultiSelect({
      message: 'Select auth providers',
      options: [
        { value: 'email', label: 'Email / Password' },
        { value: 'google', label: 'Google OAuth' },
        { value: 'github', label: 'GitHub OAuth' },
      ],
    })

    expect(clack.multiselect).toHaveBeenCalled()
    expect(result).toEqual(['email', 'github'])
  })

  it('promptConfirm delegates to clack and returns boolean', async () => {
    vi.mocked(clack.confirm).mockResolvedValueOnce(true as any)

    const result = await promptConfirm({
      message: 'Enable rate limiting?',
      initialValue: true,
    })

    expect(clack.confirm).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('handles custom onCancel handlers gracefully without exiting', async () => {
    const cancelSymbol = Symbol('clack:cancel')
    vi.mocked(clack.text).mockResolvedValueOnce(cancelSymbol as any)

    const onCancel = vi.fn()
    const result = await promptText({
      message: 'Project name',
      onCancel,
    })

    expect(onCancel).toHaveBeenCalled()
    expect(result).toBe('')
  })
})
