/**
 * Solarch CLI Development Workflow Facade
 */

import { DevOptions } from './types.js'
import { DevRunner } from './runner.js'

export * from './types.js'
export * from './formatter.js'
export * from './watcher.js'
export * from './controls.js'
export * from './runner.js'

/**
 * Main entrypoint for solarch dev
 */
export async function runDev(opts: DevOptions = {}): Promise<DevRunner> {
  const runner = new DevRunner(opts)
  await runner.start()
  return runner
}
