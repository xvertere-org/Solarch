/**
 * Solarch CLI: solarch inspect features
 * Inspects enabled Solarch runtime features (authentication, storage, realtime, AI, hooks, rate limiting).
 */

import path from 'path'
import fs from 'fs'
import { BaseInspectOptions, FeaturesInspectReport } from './types.js'
import { resolveEffectiveConfig } from '../config/resolver.js'
import { formatFeaturesInspect } from './formatter.js'
import { colors } from '../../ui/theme.js'

export async function runInspectFeatures(opts: BaseInspectOptions = {}): Promise<FeaturesInspectReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const { report: cfgReport } = resolveEffectiveConfig(opts)

  const report: FeaturesInspectReport = {
    auth: {
      providers: cfgReport.auth.providers,
    },
    storage: {
      type: 'local filesystem',
      enabled: true,
    },
    realtime: {
      enabled: true,
    },
    ai: {
      enabled: cfgReport.features.ai,
    },
    hooks: {
      enabled: true,
    },
    rateLimiting: {
      enabled: cfgReport.features.rateLimiting,
    },
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatFeaturesInspect(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
