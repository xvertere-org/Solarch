import { describe, it, expect } from 'vitest'
import { CapabilityResolver } from '../capabilities/resolver.js'
import { CapabilityMatrix } from '../capabilities/matrix.js'
import { CapabilityMap } from '../schema/capability.js'

describe('Platform Capabilities & Resolver (Phase 4)', () => {
  it('1. maps active capabilities to required SDKs and plugins', () => {
    const capabilities: CapabilityMap = {
      auth: { enabled: true, config: { providers: ['email', 'google'], mfa: true } },
      realtime: { enabled: true, config: { transports: ['websocket'] } },
      ai: { enabled: true, config: { vectorSearch: true, models: ['text-embedding-3-small'] } },
      storage: { enabled: true, config: { provider: 's3', bucket: 'my-bucket' } },
    }

    const bundle = CapabilityResolver.resolve(capabilities)

    expect(bundle.sdkRequirements.map((s) => s.sdk)).toContain('@solarch/core-client')
    expect(bundle.sdkRequirements.map((s) => s.sdk)).toContain('solarch-web')
    expect(bundle.sdkRequirements.map((s) => s.sdk)).toContain('solarch-ai')

    expect(bundle.pluginRequirements.map((p) => p.name)).toContain('storage-s3')
  })

  it('2. validates capability configurations correctly', () => {
    const validCaps: CapabilityMap = {
      ai: { enabled: true, config: { vectorSearch: true, models: ['all-MiniLM-L6-v2'] } },
    }
    expect(CapabilityResolver.validate(validCaps).valid).toBe(true)

    const invalidCaps: CapabilityMap = {
      ai: { enabled: true, config: { vectorSearch: true, models: [] } },
    }
    const validation = CapabilityResolver.validate(invalidCaps)
    expect(validation.valid).toBe(false)
    expect(validation.errors[0]).toContain('embedding model')
  })

  it('3. supports extensible custom capability identifiers', () => {
    const customCaps: CapabilityMap = {
      'custom-billing': {
        enabled: true,
        version: '2.1.0',
        config: { gateway: 'stripe' },
      },
    }

    expect(customCaps['custom-billing'].enabled).toBe(true)
    expect(customCaps['custom-billing'].config.gateway).toBe('stripe')
  })
})
