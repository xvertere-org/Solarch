/**
 * Types and interfaces for the Solarch CLI Logs subcommand.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'all'

export interface LogEntry {
  id?: string
  timestamp: string
  level: LogLevel | string
  message: string
  data?: any
  duration?: number
}

export interface LogsOptions {
  dir?: string
  follow?: boolean
  level?: string
  json?: boolean
  tail?: number | string
  exitOnComplete?: boolean
}
