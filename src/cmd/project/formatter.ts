/**
 * Safe terminal formatters for Solarch project lifecycle subcommands.
 */

import { ProjectPathReport, ProjectCleanResult, ProjectResetResult } from './types.js'
import { colors } from '../../ui/theme.js'

export function formatProjectPath(report: ProjectPathReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Project Path'))}\n`)

  console.log(`${colors.dim('Current project:')}`)
  console.log(`${report.projectDir}\n`)

  if (report.configFile) {
    console.log(`${colors.dim('Config:')}`)
    console.log(`${report.configFile}\n`)
  }

  console.log(`${colors.dim('Data:')}`)
  console.log(`${report.dataDir}\n`)

  console.log(`${colors.dim('Migration:')}`)
  console.log(`${report.migrationsDir}\n`)
}

export function formatProjectClean(result: ProjectCleanResult): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Cleaning Project'))}\n`)

  if (!result.cleaned || result.removedPaths.length === 0) {
    console.log(colors.dim('No removable runtime artifacts found.\n'))
    return
  }

  for (const p of result.removedPaths) {
    console.log(`${colors.green('✔')} Removed ${p}`)
  }

  console.log(`\n${colors.green('Project cleaned.')}\n`)
}

export function formatProjectReset(result: ProjectResetResult): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Resetting Project'))}\n`)

  if (result.databaseRemoved) {
    console.log(`${colors.green('✔')} Removed database`)
  }
  if (result.runtimeRecreated) {
    console.log(`${colors.green('✔')} Recreated runtime`)
  }
  if (result.doctorValidated) {
    console.log(`${colors.green('✔')} Validation passed`)
  }

  console.log(`\n${colors.green('Project ready.')}\n`)
}
