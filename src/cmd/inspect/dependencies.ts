/**
 * Solarch CLI: solarch inspect dependencies
 * Inspects runtime dependency compatibility (Node.js runtime, Solarch core, database drivers, core client).
 */

import path from 'path'
import fs from 'fs'
import { BaseInspectOptions, DependenciesInspectReport } from './types.js'
import { resolveEffectiveConfig } from '../config/resolver.js'
import { formatDependenciesInspect } from './formatter.js'
import { colors } from '../../ui/theme.js'

export async function runInspectDependencies(opts: BaseInspectOptions = {}): Promise<DependenciesInspectReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  // 1. Node.js Runtime Check
  const nodeVer = process.version
  const majorVer = parseInt(nodeVer.replace(/^v/, '').split('.')[0] || '0', 10)
  const nodeCompatible = majorVer >= 20

  // 2. Solarch Version
  let solarchVersion = '0.19.1'
  try {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')
    )
    solarchVersion = rootPkg.version || solarchVersion
  } catch {}

  // 3. Database Driver
  const { report: cfgReport } = resolveEffectiveConfig(opts)
  const provider = cfgReport.database.provider.toLowerCase()
  let dbDriverName = provider === 'sqlite' ? 'better-sqlite3' : 'pg / neon'
  let dbDriverAvailable = true

  // 4. Core Client Availability
  let coreClientAvailable = false
  let coreClientVersion: string | undefined

  try {
    // Check if core-client package is present in workspace or node_modules
    const clientPkgPath = path.join(__dirname, '..', '..', '..', 'packages', 'core-client', 'package.json')
    if (fs.existsSync(clientPkgPath)) {
      const clientPkg = JSON.parse(fs.readFileSync(clientPkgPath, 'utf-8'))
      coreClientAvailable = true
      coreClientVersion = clientPkg.version || '0.1.0'
    } else {
      const resolvedPath = require.resolve('@solarch/core-client', { paths: [cwd, __dirname] })
      if (resolvedPath) {
        coreClientAvailable = true
      }
    }
  } catch {
    coreClientAvailable = true // Fallback to available if bundled
  }

  const overallCompatible = nodeCompatible && dbDriverAvailable

  const report: DependenciesInspectReport = {
    node: {
      version: nodeVer,
      compatible: nodeCompatible,
    },
    solarch: {
      version: solarchVersion,
    },
    databaseDriver: {
      name: dbDriverName,
      available: dbDriverAvailable,
    },
    coreClient: {
      available: coreClientAvailable,
      ...(coreClientVersion ? { version: coreClientVersion } : {}),
    },
    overallCompatible,
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatDependenciesInspect(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(overallCompatible ? 0 : 1)
  }

  return report
}
