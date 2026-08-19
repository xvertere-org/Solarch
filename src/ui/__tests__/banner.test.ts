import { describe, it, expect } from 'vitest'
import { formatBanner, getVersion, printVersionDetails } from '../banner'

describe('CLI Banner & Version System', () => {
  it('1. returns current package version', () => {
    const ver = getVersion()
    expect(ver).toBeDefined()
    expect(ver).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('2. formats banner with version and mission tags', () => {
    const banner = formatBanner('1.2.3')
    expect(banner).toContain('⚡ Solarch CLI v1.2.3')
    expect(banner).toContain('Developer Backend Platform')
    expect(banner).toContain('Build.')
    expect(banner).toContain('Deploy.')
    expect(banner).toContain('Scale.')
  })
})
