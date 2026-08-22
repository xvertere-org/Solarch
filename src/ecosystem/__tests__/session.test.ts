import { describe, it, expect } from 'vitest'
import { PlatformSession } from '../session'

describe('PlatformSession Contract (Phase 0)', () => {
  it('supports unauthenticated, pending, and authenticated states without tokens', () => {
    const unauth = new PlatformSession()
    expect(unauth.status).toBe('unauthenticated')
    expect(unauth.isAuthenticated()).toBe(false)

    const pending = new PlatformSession({ status: 'pending' })
    expect(pending.status).toBe('pending')
    expect(pending.isPending()).toBe(true)

    const auth = new PlatformSession({
      status: 'authenticated',
      userId: 'usr_123',
      orgId: 'org_456',
    })
    expect(auth.status).toBe('authenticated')
    expect(auth.isAuthenticated()).toBe(true)
    expect(auth.userId).toBe('usr_123')
  })

  it('strictly rejects access tokens, bearer tokens, and credentials', () => {
    expect(() => {
      new PlatformSession({
        status: 'authenticated',
        // @ts-expect-error - testing token rejection invariant
        accessToken: 'eyJhbGciOiJIUzI1NiIsIn...',
      })
    }).toThrow(/access tokens or credentials cannot be embedded/)
  })
})
