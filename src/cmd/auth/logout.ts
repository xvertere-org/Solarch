/**
 * Solarch CLI Logout Command (Phase 2)
 *
 * Implements `solarch logout`
 */

import { AuthService } from '../../platform/auth/auth-service.js'
import { output } from '../../ui/output.js'

export interface LogoutOptions {
  authService?: AuthService
}

export async function runLogout(options: LogoutOptions = {}): Promise<void> {
  const authService = options.authService ?? new AuthService()
  await authService.logout()
  output.success('Logged out from Solarch Platform. Local machine session cleared.')
}
