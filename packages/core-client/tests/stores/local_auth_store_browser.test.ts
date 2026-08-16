import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LocalAuthStore, DEFAULT_STORAGE_KEY } from '../../src/stores/LocalAuthStore.js'

describe('Phase 7: LocalAuthStore Browser Environment Tests', () => {
  let mockStorage: Record<string, string> = {}
  let originalWindow: any

  beforeEach(() => {
    mockStorage = {}
    originalWindow = (globalThis as any).window

    ;(globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val }),
        removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
        clear: vi.fn(() => { mockStorage = {} }),
      }
    }
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
    vi.restoreAllMocks()
  })

  it('persists token and model into window.localStorage on save', () => {
    const store = new LocalAuthStore('custom_auth_key')
    expect(store.storageKey).toBe('custom_auth_key')

    store.save('jwt_browser_token', { id: 'usr_1', email: 'browser@solarch.in' })

    expect(store.getToken()).toBe('jwt_browser_token')
    expect(store.getModel()).toEqual({ id: 'usr_1', email: 'browser@solarch.in' })
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'custom_auth_key',
      JSON.stringify({
        token: 'jwt_browser_token',
        model: { id: 'usr_1', email: 'browser@solarch.in' }
      })
    )
  })

  it('initializes and restores state from existing localStorage on construction', () => {
    mockStorage[DEFAULT_STORAGE_KEY] = JSON.stringify({
      token: 'persisted_jwt',
      model: { id: 'usr_saved', role: 'admin' }
    })

    const store = new LocalAuthStore()
    expect(store.getToken()).toBe('persisted_jwt')
    expect(store.getModel()).toEqual({ id: 'usr_saved', role: 'admin' })
  })

  it('handles corrupted JSON in localStorage without throwing', () => {
    mockStorage[DEFAULT_STORAGE_KEY] = '{ corrupted_invalid_json }'

    const store = new LocalAuthStore()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
  })

  it('clears state and removes item from localStorage on clear()', () => {
    mockStorage[DEFAULT_STORAGE_KEY] = JSON.stringify({
      token: 'will_be_cleared',
      model: { id: 'usr_x' }
    })

    const store = new LocalAuthStore()
    expect(store.getToken()).toBe('will_be_cleared')

    store.clear()
    expect(store.getToken()).toBe('')
    expect(store.getModel()).toBeNull()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(DEFAULT_STORAGE_KEY)
  })

  it('gracefully handles localStorage quota exceeded errors on save', () => {
    ;(globalThis as any).window.localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError: DOMException')
    })

    const store = new LocalAuthStore()
    // Should not throw even when storage is full
    expect(() => store.save('test_token', { id: 'usr_quota' })).not.toThrow()
    expect(store.getToken()).toBe('test_token')
  })
})
