/**
 * Solarch CLI Ecosystem — Plugin Selection Contract (Phase 0)
 *
 * Represents plugin intent during project planning.
 * Supports:
 * - none (no plugins)
 * - later (defer configuration to future Dashboard)
 * - selected (explicit plugin list)
 *
 * INVARIANT: Never contains plugin credentials, API keys, or client secrets.
 */

export type PluginSelectionMode = 'none' | 'later' | 'selected'

export interface PluginSelectionInput {
  mode?: PluginSelectionMode
  plugins?: string[]
}

export class PluginSelection {
  public readonly mode: PluginSelectionMode
  public readonly plugins: ReadonlyArray<string>

  constructor(input: PluginSelectionInput = {}) {
    PluginSelection.assertNoSecrets(input)

    this.mode = input.mode ?? 'none'
    this.plugins = Object.freeze(input.plugins ? [...input.plugins] : [])
  }

  public toJSON() {
    return {
      mode: this.mode,
      plugins: [...this.plugins],
    }
  }

  /**
   * Static invariant check ensuring no credential or API key fields are present.
   */
  public static assertNoSecrets(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    const forbiddenKeys = [
      'key',
      'secret',
      'apikey',
      'api_key',
      'token',
      'password',
      'credential',
      'clientsecret',
      'client_secret',
    ]

    const check = (item: any) => {
      if (!item || typeof item !== 'object') return
      for (const [k, v] of Object.entries(item)) {
        const lower = k.toLowerCase()
        if (forbiddenKeys.some(fk => lower === fk || lower.includes('secret') || lower.includes('key'))) {
          throw new Error(`PluginSelection invariant violation: credentials/keys are strictly forbidden in plugin selection (found key: "${k}").`)
        }
        if (typeof v === 'object' && v !== null) {
          check(v)
        }
      }
    }

    check(obj)
  }
}
