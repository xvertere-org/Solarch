/**
 * Scanner for discovering Solarch REST, Realtime, and Middleware surfaces.
 */

import { RouteEntry, RealtimeEndpoint, RoutesReport } from './types.js'

export const STANDARD_ROUTES: RouteEntry[] = [
  // Record CRUD
  { method: 'GET', path: '/api/collections/:c/records', category: 'REST', auth: 'List rule' },
  { method: 'POST', path: '/api/collections/:c/records', category: 'REST', auth: 'Create rule' },
  { method: 'GET', path: '/api/collections/:c/records/:id', category: 'REST', auth: 'View rule' },
  { method: 'PATCH', path: '/api/collections/:c/records/:id', category: 'REST', auth: 'Update rule' },
  { method: 'DELETE', path: '/api/collections/:c/records/:id', category: 'REST', auth: 'Delete rule' },
  { method: 'POST', path: '/api/collections/:c/vector-search', category: 'REST', auth: 'List rule' },

  // Auth & Identity
  { method: 'POST', path: '/api/collections/:c/auth-with-password', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/collections/:c/auth-with-oauth2', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/collections/:c/auth-refresh', category: 'REST', auth: 'User' },
  { method: 'POST', path: '/api/collections/:c/request-password-reset', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/collections/:c/confirm-password-reset', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/collections/:c/request-verification', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/collections/:c/confirm-verification', category: 'REST', auth: 'Public' },

  // Admin & Schema
  { method: 'POST', path: '/api/admins/auth-with-password', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/admins/auth-refresh', category: 'REST', auth: 'Admin' },
  { method: 'GET', path: '/api/collections', category: 'REST', auth: 'Admin' },
  { method: 'POST', path: '/api/collections', category: 'REST', auth: 'Admin' },
  { method: 'GET', path: '/api/collections/:id', category: 'REST', auth: 'Admin' },
  { method: 'PATCH', path: '/api/collections/:id', category: 'REST', auth: 'Admin' },
  { method: 'DELETE', path: '/api/collections/:id', category: 'REST', auth: 'Admin' },

  // System & Utilities
  { method: 'GET', path: '/api/health', category: 'REST', auth: 'Public' },
  { method: 'POST', path: '/api/batch', category: 'REST', auth: 'Varies' },
  { method: 'GET', path: '/api/settings', category: 'REST', auth: 'Admin' },
  { method: 'PATCH', path: '/api/settings', category: 'REST', auth: 'Admin' },
  { method: 'GET', path: '/api/backups', category: 'REST', auth: 'Admin' },
  { method: 'POST', path: '/api/backups', category: 'REST', auth: 'Admin' },
  { method: 'GET', path: '/api/logs', category: 'REST', auth: 'Admin' },
  { method: 'GET', path: '/api/metrics', category: 'REST', auth: 'Admin' },
  { method: 'POST', path: '/api/ai/chat', category: 'REST', auth: 'User/Admin' },
]

export const STANDARD_REALTIME: RealtimeEndpoint[] = [
  { type: 'SSE', path: '/api/realtime', description: 'Server-Sent Events subscriptions' },
  { type: 'WS', path: '/realtime', description: 'WebSocket dual-protocol subscriptions' },
]

export const STANDARD_MIDDLEWARE = [
  'cors',
  'helmet',
  'rate-limit',
  'auth',
]

/**
 * Scans available routes in Solarch
 */
export function scanRoutes(): RoutesReport {
  return {
    routes: STANDARD_ROUTES,
    realtime: STANDARD_REALTIME,
    middleware: STANDARD_MIDDLEWARE,
  }
}
