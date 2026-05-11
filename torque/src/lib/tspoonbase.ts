import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TspoonbaseConnection {
  url: string
  token: string | null
  user: { email: string } | null
  connected: boolean
  connecting: boolean
  error: string | null
}

interface TspoonbaseStore {
  connection: TspoonbaseConnection
  connect: (url: string, email: string, password: string) => Promise<void>
  disconnect: () => void
  clearError: () => void
  testConnection: () => Promise<boolean>
}

export const useTspoonbaseStore = create<TspoonbaseStore>()(
  persist(
    (set, get) => ({
      connection: {
        url: '',
        token: null,
        user: null,
        connected: false,
        connecting: false,
        error: null,
      },

      connect: async (url: string, email: string, password: string) => {
        set(state => ({ connection: { ...state.connection, connecting: true, error: null } }))
        try {
          const base = url.replace(/\/+$/, '')
          const res = await fetch(`${base}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.message || 'Authentication failed')
          }
          const data = await res.json()
          set({
            connection: {
              url: base,
              token: data.token,
              user: data.admin || { email },
              connected: true,
              connecting: false,
              error: null,
            },
          })
        } catch (err: any) {
          if (err.message === 'Failed to fetch' || err instanceof TypeError) {
            const hint = url.includes('localhost') && typeof window !== 'undefined' && window.location.protocol === 'https:'
              ? 'Mixed content blocked. Use HTTPS for TspoonBase or run Torque locally.'
              : 'Cannot reach server. Is TspoonBase running?'
            set(state => ({ connection: { ...state.connection, connecting: false, error: hint } }))
          } else {
            set(state => ({ connection: { ...state.connection, connecting: false, error: err.message } }))
          }
        }
      },

      disconnect: () => {
        set({
          connection: { url: '', token: null, user: null, connected: false, connecting: false, error: null },
        })
      },

      clearError: () => {
        set(state => ({ connection: { ...state.connection, error: null } }))
      },

      testConnection: async () => {
        const { connection } = get()
        if (!connection.token || !connection.url) return false
        try {
          const res = await fetch(`${connection.url}/api/health`, {
            headers: { Authorization: `Bearer ${connection.token}` },
          })
          return res.ok
        } catch {
          return false
        }
      },
    }),
    {
      name: 'torque-tspoonbase',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        connection: {
          url: state.connection.url,
          token: state.connection.token,
          user: state.connection.user,
          connected: state.connection.connected,
        },
      }),
    }
  )
)

export async function tspoonbaseFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const { connection } = useTspoonbaseStore.getState()
  if (!connection.token || !connection.url) {
    throw new Error('Not connected to TspoonBase')
  }
  const base = connection.url.replace(/\/+$/, '')
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> || {}),
    Authorization: `Bearer ${connection.token}`,
  }
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${base}${path}`, { ...opts, headers })
  if (res.status === 401) {
    useTspoonbaseStore.getState().disconnect()
    throw new Error('TspoonBase session expired')
  }
  return res.json()
}
