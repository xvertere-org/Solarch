/**
 * Types and interfaces for the Solarch CLI Development Workflow (solarch dev).
 */

import http from 'http'
import { Solarch } from '../../solarch.js'

export interface DevOptions {
  dir?: string
  port?: string | number
  watch?: boolean
  verbose?: boolean
  exitOnComplete?: boolean
}

export interface DevState {
  port: number
  cwd: string
  watching: boolean
  isRunning: boolean
  watchPaths: string[]
  app?: Solarch
  server?: http.Server
}
