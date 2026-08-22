import { describe, it, expect } from 'vitest'
import { PluginSelection } from '../plugin'

describe('PluginSelection Contract (Phase 0)', () => {
  it('supports none, later, and selected modes', () => {
    const none = new PluginSelection()
    expect(none.mode).toBe('none')
    expect(none.plugins).toEqual([])

    const later = new PluginSelection({ mode: 'later' })
    expect(later.mode).toBe('later')

    const selected = new PluginSelection({
      mode: 'selected',
      plugins: ['stripe', 'resend'],
    })
    expect(selected.mode).toBe('selected')
    expect(selected.plugins).toEqual(['stripe', 'resend'])
  })

  it('strictly rejects API keys and secrets in plugin selection', () => {
    expect(() => {
      new PluginSelection({
        mode: 'selected',
        plugins: ['stripe'],
        // @ts-expect-error - testing secret rejection invariant
        stripeApiKey: 'sk_test_12345',
      })
    }).toThrow(/credentials\/keys are strictly forbidden/)
  })
})
