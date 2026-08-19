/**
 * Types and interfaces for the Solarch CLI Routes discovery command.
 */

export interface RouteEntry {
  method: string
  path: string
  category: 'REST' | 'Realtime' | 'Admin' | 'System'
  auth?: string
  description?: string
}

export interface RealtimeEndpoint {
  type: string
  path: string
  description?: string
}

export interface RoutesReport {
  routes: RouteEntry[]
  realtime: RealtimeEndpoint[]
  middleware: string[]
}

export interface RoutesOptions {
  dir?: string
  json?: boolean
  exitOnComplete?: boolean
}
