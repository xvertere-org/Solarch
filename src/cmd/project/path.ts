/**
 * Solarch CLI: solarch project path
 * Resolves and displays absolute project directory, config file, data dir, and migrations dir paths.
 */

import fs from 'fs'
import path from 'path'
import { ProjectPathOptions, ProjectPathReport } from './types.js'
import { formatProjectPath } from './formatter.js'
import { colors } from '../../ui/theme.js'

export async function runProjectPath(opts: ProjectPathOptions = {}): Promise<ProjectPathReport> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  // 1. Locate config file
  let configFile: string | undefined
  const tsPath = path.join(cwd, 'solarch.config.ts')
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  if (fs.existsSync(tsPath)) {
    configFile = tsPath
  } else if (fs.existsSync(jsPath)) {
    configFile = jsPath
  } else if (fs.existsSync(jsonPath)) {
    configFile = jsonPath
  }

  // 2. Core project directories
  const dataDir = path.join(cwd, 'pb_data')
  const migrationsDir = path.join(cwd, 'pb_migrations')

  const report: ProjectPathReport = {
    projectDir: cwd,
    ...(configFile ? { configFile } : {}),
    dataDir,
    migrationsDir,
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    formatProjectPath(report)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
