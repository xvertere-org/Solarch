import { describe, it, expect } from 'vitest'
import { CompatibilityModel } from '../compatibility'
import { ECOSYSTEM_SDKS } from '../sdk'

describe('CompatibilityModel Contract (Phase 0)', () => {
  it('correctly verifies compatibility between SDK metadata and runtime version', () => {
    const webSdk = ECOSYSTEM_SDKS['solarch-web']

    const checkCurrent = CompatibilityModel.checkSdkCompatibility(webSdk, '0.19.8')
    expect(checkCurrent.compatible).toBe(true)

    const checkFuture = CompatibilityModel.checkSdkCompatibility(webSdk, '0.20.0')
    expect(checkFuture.compatible).toBe(true)

    const checkOld = CompatibilityModel.checkSdkCompatibility(webSdk, '0.18.0')
    expect(checkOld.compatible).toBe(false)
    expect(checkOld.message).toMatch(/requires Solarch runtime/)
  })
})
