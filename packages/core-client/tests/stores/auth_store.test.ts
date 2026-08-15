import { describe, it, expect, vi } from 'vitest'
import { MemoryAuthStore, LocalAuthStore, decodeJwtPayload } from '../../src/stores/index.js'

describe('AuthStore Unit Tests', () => {
  it('decodes JWT payload correctly and checks isValid', () => {
    const store = new MemoryAuthStore()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
    expect(store.isValid()).toBe(false)

    // Token with exp in future
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const payload = { id: 'usr_1', exp: futureExp }
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '')
    const validToken = `header.${encodedPayload}.signature`

    store.save(validToken, { id: 'usr_1', email: 'user@example.com' })
    expect(store.getToken()).toBe(validToken)
    expect(store.getModel()).toEqual({ id: 'usr_1', email: 'user@example.com' })
    expect(store.isValid()).toBe(true)

    // Token with exp in past
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const expiredPayload = { id: 'usr_1', exp: pastExp }
    const expiredEncoded = Buffer.from(JSON.stringify(expiredPayload)).toString('base64').replace(/=/g, '')
    const expiredToken = `header.${expiredEncoded}.signature`

    store.save(expiredToken, null)
    expect(store.isValid()).toBe(false)
  })

  it('notifies subscribers on save and clear, and supports unsubscribe', () => {
    const store = new MemoryAuthStore()
    const listener = vi.fn()
    const unsub = store.subscribe(listener)

    store.save('tok_123', { id: 'rec_1' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('tok_123', { id: 'rec_1' })

    store.clear()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenCalledWith('', null)

    unsub()
    store.save('tok_456', null)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('LocalAuthStore gracefully falls back when localStorage is not available', () => {
    const store = new LocalAuthStore('test_key')
    store.save('local_token', { id: 'usr_local' })
    expect(store.getToken()).toBe('local_token')
    expect(store.getModel()).toEqual({ id: 'usr_local' })
  })
})
