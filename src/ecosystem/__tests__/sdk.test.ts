import { describe, it, expect } from 'vitest'
import { ECOSYSTEM_SDKS, getSdkMetadata, listEcosystemSdks } from '../sdk.js'
import { SdkSelection } from '../selection.js'

describe('SDK Metadata & Selection Contracts (Phase 0 & Ecosystem Alignment)', () => {
  it('contains metadata for all ecosystem SDK packages without importing implementation', () => {
    const sdks = listEcosystemSdks()
    expect(sdks.length).toBeGreaterThanOrEqual(4)

    const webSdk = getSdkMetadata('solarch-web')
    expect(webSdk).toBeDefined()
    expect(webSdk?.packageName).toBe('solarch-web')
    expect(webSdk?.supportedPlatforms).toContain('browser')

    const aiSdk = getSdkMetadata('solarch-ai')
    expect(aiSdk).toBeDefined()
    expect(aiSdk?.capabilities).toContain('vector_search')

    const mobileSdk = getSdkMetadata('solarch-rn')
    expect(mobileSdk).toBeDefined()
    expect(mobileSdk?.capabilities).toContain('offline_sync')

    const electronSdk = getSdkMetadata('solarch-electron')
    expect(electronSdk).toBeDefined()
    expect(electronSdk?.desktopRuntimes).toEqual(['electron'])

    const tauriSdk = getSdkMetadata('solarch-tauri')
    expect(tauriSdk).toBeDefined()
    expect(tauriSdk?.desktopRuntimes).toEqual(['tauri'])
  })

  it('preserves recommended vs selected SDKs and tracks overrides', () => {
    const recSelection = new SdkSelection({
      recommended: [
        {
          packageName: 'solarch-ai',
          reason: 'AI application uses AI client',
          source: 'application-type',
        },
      ],
      source: 'recommendation',
    })

    expect(recSelection.selected).toEqual(['solarch-ai'])
    expect(recSelection.isOverridden()).toBe(false)

    // User overrides by choosing solarch-web alongside solarch-ai
    const overrideSelection = new SdkSelection({
      selected: ['solarch-ai', 'solarch-web'],
      recommended: [
        {
          packageName: 'solarch-ai',
          reason: 'AI application uses AI client',
          source: 'application-type',
        },
      ],
      source: 'user',
    })

    expect(overrideSelection.selected).toEqual(['solarch-ai', 'solarch-web'])
    expect(overrideSelection.isOverridden()).toBe(true)
  })
})
