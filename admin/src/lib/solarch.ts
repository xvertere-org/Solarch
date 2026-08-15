/**
 * Canonical SolarchClient instance for the Admin application.
 * Configured with LocalAuthStore for browser-side credential persistence.
 */

import { SolarchClient, LocalAuthStore } from '@solarch/core-client'

export const solarch = new SolarchClient('', {
  authStore: new LocalAuthStore('solarch_admin_auth'),
})

export default solarch
