import { describe, it, expect, vi } from 'vitest'
import { AdminService } from '../../src/services/AdminService.js'
import { HttpClient } from '../../src/http/HttpClient.js'
import { MemoryAuthStore } from '../../src/stores/MemoryAuthStore.js'

describe('AdminService Unit Suite', () => {
  it('authenticates with password and automatically saves token and admin model to authStore', async () => {
    const authStore = new MemoryAuthStore()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => ({
        token: 'admin-jwt-token-12345',
        admin: {
          id: 'adm_01',
          email: 'admin@example.com',
        },
      }),
    })

    const http = new HttpClient({
      baseUrl: 'http://localhost:8090',
      authStore,
      fetch: mockFetch,
    })

    const adminService = new AdminService(http)
    const res = await adminService.authWithPassword('admin@example.com', 'password123')

    expect(res.token).toBe('admin-jwt-token-12345')
    expect(res.admin.email).toBe('admin@example.com')
    expect(authStore.getToken()).toBe('admin-jwt-token-12345')
    expect(authStore.getModel()).toEqual({
      id: 'adm_01',
      email: 'admin@example.com',
    })
    expect(authStore.isValid()).toBe(true)

    // Verify request payload
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8090/api/admins/auth-with-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identity: 'admin@example.com', password: 'password123' }),
      })
    )
  })

  it('refreshes token and updates authStore', async () => {
    const authStore = new MemoryAuthStore('initial-admin-token', { id: 'adm_01', email: 'admin@example.com' })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => ({
        token: 'refreshed-admin-jwt-token',
        admin: { id: 'adm_01', email: 'admin@example.com' },
      }),
    })

    const http = new HttpClient({
      baseUrl: 'http://localhost:8090',
      authStore,
      fetch: mockFetch,
    })

    const adminService = new AdminService(http)
    const res = await adminService.authRefresh()

    expect(res.token).toBe('refreshed-admin-jwt-token')
    expect(authStore.getToken()).toBe('refreshed-admin-jwt-token')
  })

  it('handles request password reset and confirm password reset', async () => {
    const authStore = new MemoryAuthStore()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Password reset sent' }),
    })

    const http = new HttpClient({
      baseUrl: 'http://localhost:8090',
      authStore,
      fetch: mockFetch,
    })

    const adminService = new AdminService(http)
    const resetSent = await adminService.requestPasswordReset('admin@example.com')
    expect(resetSent).toBe(true)

    const resetConfirmed = await adminService.confirmPasswordReset('token123', 'newpass123', 'newpass123')
    expect(resetConfirmed).toBe(true)
  })
})
