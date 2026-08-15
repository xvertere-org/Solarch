/**
 * Reactive React hook for Solarch authentication state in Admin UI.
 * Automatically synchronizes with solarch.authStore.
 */

import { useState, useEffect } from 'react'
import { solarch } from '../lib/solarch'
import type { AdminModel, AuthModel } from '@solarch/core-client'

export interface AuthState {
  token: string
  admin: AdminModel | null
  isValid: boolean
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => ({
    token: solarch.authStore.getToken(),
    admin: solarch.authStore.getModel() as AdminModel | null,
    isValid: solarch.authStore.isValid(),
    loading: false,
  }))

  useEffect(() => {
    // Initial sync
    setState({
      token: solarch.authStore.getToken(),
      admin: solarch.authStore.getModel() as AdminModel | null,
      isValid: solarch.authStore.isValid(),
      loading: false,
    })

    // Subscribe to changes in solarch.authStore
    const unsubscribe = solarch.authStore.subscribe((token: string, model: AuthModel) => {
      setState({
        token,
        admin: model as AdminModel | null,
        isValid: !!token,
        loading: false,
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const logout = () => {
    solarch.authStore.clear()
  }

  return {
    ...state,
    logout,
  }
}
