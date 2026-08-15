import { describe, it, expect, vi } from 'vitest'
import { MemoryAuthStore, LocalAuthStore } from '../../src/stores/index.js'

describe('AuthStore Unit Tests', () => {
  it('treats token as opaque string and checks isValid correctly', () => {
    const store = new MemoryAuthStore()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
    expect(store.isValid()).toBe(false)

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.opaque.sig'
    store.save(token, { id: 'usr_1', email: 'user@example.com' })
    expect(store.getToken()).toBe(token)
    expect(store.getModel()).toEqual({ id: 'usr_1', email: 'user@example.com' })
    expect(store.isValid()).toBe(true)

    store.clear()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
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
