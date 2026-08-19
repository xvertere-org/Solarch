/**
 * Solarch CLI: solarch routes
 * Discovers and inspects REST endpoints, Realtime dual-protocols, and active middleware.
 */

import fs from 'fs'
import path from 'path'
import { RoutesOptions, RoutesReport } from './types.js'
import { scanRoutes } from './scanner.js'
import { formatRoutesOutput } from './formatter.js'
import { colors } from '../../ui/theme.js'

export * from './types.js'
export * from './scanner.js'
export * from './formatter.js'

export async function runRoutes(opts: RoutesOptions = {}): Promise<RoutesReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const report = scanRoutes()

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatRoutesOutput(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
