/**
 * Solarch CLI: solarch inspect database
 * Inspects database provider, storage, host, database name, status, and capabilities.
 * Guarantees zero credential leakage.
 */

import path from 'path'
import fs from 'fs'
import { BaseInspectOptions, DatabaseInspectReport } from './types.js'
import { resolveEffectiveConfig } from '../config/resolver.js'
import { formatDatabaseInspect } from './formatter.js'
import { maskDatabaseUrl } from '../env/masking.js'
import { colors } from '../../ui/theme.js'

export async function runInspectDatabase(opts: BaseInspectOptions = {}): Promise<DatabaseInspectReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const { report: cfgReport, env } = resolveEffectiveConfig(opts)
  const provider = cfgReport.database.provider.toLowerCase()

  let storage: string | undefined
  let host: string | undefined
  let databaseName: string | undefined
  let maskedUrl: string | undefined
  let capabilities: string[] = []
  let status = 'configured'

  if (provider === 'sqlite') {
    storage = cfgReport.runtime.dataDir || './pb_data'
    capabilities = ['transactions', 'migrations', 'backups', 'wal']
    const resolvedDataDir = path.isAbsolute(storage) ? storage : path.join(cwd, storage)
    if (fs.existsSync(resolvedDataDir) || fs.existsSync(path.dirname(resolvedDataDir))) {
      status = 'connected'
    }
  } else if (provider === 'postgres') {
    capabilities = ['transactions', 'migrations', 'pooling', 'ssl']
    const rawUrl = env.DATABASE_URL || cfgReport.database.url
    if (rawUrl) {
      maskedUrl = maskDatabaseUrl(rawUrl)
      try {
        const parsed = new URL(rawUrl)
        host = `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
        databaseName = parsed.pathname.replace(/^\//, '')
      } catch {}
    }
  } else if (provider === 'mongodb') {
    capabilities = ['atomic document updates', 'indexes', 'aggregation']
    const rawUrl = env.DATABASE_URL || cfgReport.database.url
    if (rawUrl) {
      maskedUrl = maskDatabaseUrl(rawUrl)
    }
  }

  const report: DatabaseInspectReport = {
    provider,
    driver: cfgReport.database.driver || provider,
    mode: cfgReport.database.mode || (provider === 'sqlite' ? 'local' : 'tcp'),
    status,
    ...(storage ? { storage } : {}),
    ...(host ? { host } : {}),
    ...(databaseName ? { database: databaseName } : {}),
    ...(maskedUrl ? { url: maskedUrl } : {}),
    capabilities,
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatDatabaseInspect(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
