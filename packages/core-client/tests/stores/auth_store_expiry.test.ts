import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'

/**
 * BUG-3 tests: isValid() must check JWT expiry, not just !!token.
 *
 * JWT structure: header.payload.signature (all base64url-encoded)
 * We only need to craft the payload portion with an `exp` claim.
 */

function createJwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({ sub: 'usr_1', exp: expSeconds }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const signature = 'test_signature'
  return `${header}.${payload}.${signature}`
}

function createJwtWithoutExp(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({ sub: 'usr_1', role: 'admin' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const signature = 'test_signature'
  return `${header}.${payload}.${signature}`
}

describe('BUG-3: isValid() JWT Expiry Check', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false for empty/missing token', () => {
    const store = new MemoryAuthStore()
    expect(store.isValid()).toBe(false)
  })

  it('returns true for a valid, unexpired JWT', () => {
    const store = new MemoryAuthStore()
    // Token expires 1 hour from now
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = createJwtWithExp(futureExp)
    store.save(token, { id: 'usr_1' })
    expect(store.isValid()).toBe(true)
  })

  it('returns false for an expired JWT', () => {
    const store = new MemoryAuthStore()
    // Token expired 1 hour ago
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const token = createJwtWithExp(pastExp)
    store.save(token, { id: 'usr_1' })
    expect(store.isValid()).toBe(false)
  })

  it('returns false for a JWT that expires exactly now (boundary)', () => {
    const store = new MemoryAuthStore()
    // exp === current time (not strictly greater)
    const nowExp = Math.floor(Date.now() / 1000)
    const token = createJwtWithExp(nowExp)
    store.save(token, { id: 'usr_1' })
    // exp must be GREATER than now, so exactly-now is invalid
    expect(store.isValid()).toBe(false)
  })

  it('returns true when JWT has no exp claim (non-expiring token)', () => {
    const store = new MemoryAuthStore()
    const token = createJwtWithoutExp()
    store.save(token, { id: 'usr_1' })
    expect(store.isValid()).toBe(true)
  })

  it('returns true for an opaque, non-JWT token without 3 parts', () => {
    const store = new MemoryAuthStore()
    store.save('sk_live_abc123_opaque_key', { id: 'usr_1' })
    expect(store.isValid()).toBe(true)
  })

  it('returns false for a JWT-shaped token (3 parts) with corrupted/invalid payload (Fix 4)', () => {
    const store = new MemoryAuthStore()
    store.save('header.not-valid-base64!!!.signature', { id: 'usr_1' })
    expect(store.isValid()).toBe(false)

    store.save('header.invalid_json_payload.signature', { id: 'usr_1' })
    expect(store.isValid()).toBe(false)
  })

  it('transitions from valid to invalid after clear()', () => {
    const store = new MemoryAuthStore()
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    store.save(createJwtWithExp(futureExp), { id: 'usr_1' })
    expect(store.isValid()).toBe(true)

    store.clear()
    expect(store.isValid()).toBe(false)
  })

  it('handles base64url encoding with special characters', () => {
    const store = new MemoryAuthStore()
    // Create a payload that would have + and / in standard base64
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const payload = btoa(JSON.stringify({
      sub: 'usr_with_special_chars_àéîõü',
      exp: futureExp,
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const token = `${header}.${payload}.sig`
    store.save(token, { id: 'usr_1' })
    expect(store.isValid()).toBe(true)
  })
})
