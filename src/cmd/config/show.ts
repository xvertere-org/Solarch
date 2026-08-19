/**
 * Solarch CLI: solarch config show
 * Displays effective resolved configuration across CLI, environment, config file, and defaults.
 */

import { ConfigShowOptions, ConfigShowReport } from './types.js'
import { resolveEffectiveConfig } from './resolver.js'
import { formatConfigTerminal, formatConfigJson } from './formatter.js'

export async function runConfigShow(opts: ConfigShowOptions = {}): Promise<ConfigShowReport> {
  const { report } = resolveEffectiveConfig(opts)

  if (opts.json) {
    console.log(formatConfigJson(report))
  } else {
    formatConfigTerminal(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
