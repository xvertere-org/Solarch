/**
 * Solarch CLI: solarch inspect project
 * Inspects project identity, Solarch version, config file, runtime, platform, and environment.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { BaseInspectOptions, ProjectInspectReport } from './types.js'
import { formatProjectInspect } from './formatter.js'
import { colors } from '../../ui/theme.js'

export async function runInspectProject(opts: BaseInspectOptions = {}): Promise<ProjectInspectReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  // 1. Solarch engine version
  let solarchVersion = '0.19.1'
  try {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')
    )
    solarchVersion = rootPkg.version || solarchVersion
  } catch {}

  // 2. Project name and metadata
  let projectName = path.basename(cwd)
  const pkgPath = path.join(cwd, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.name) projectName = pkg.name
    } catch {}
  }

  // 3. Configuration file detection
  let configFile = 'none'
  if (fs.existsSync(path.join(cwd, 'solarch.config.ts'))) {
    configFile = 'solarch.config.ts'
  } else if (fs.existsSync(path.join(cwd, 'solarch.config.js'))) {
    configFile = 'solarch.config.js'
  } else if (fs.existsSync(path.join(cwd, 'solarch.config.json'))) {
    configFile = 'solarch.config.json'
  }

  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const platform = `${os.type()} ${os.release()} (${os.arch()})`

  const report: ProjectInspectReport = {
    projectName,
    solarchVersion,
    configFile,
    nodeVersion: process.version,
    platform,
    environment,
    projectDir: cwd,
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatProjectInspect(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
