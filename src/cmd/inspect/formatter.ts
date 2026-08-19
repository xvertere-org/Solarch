/**
 * Safe terminal formatters for Solarch inspect subcommands.
 */

import {
  ProjectInspectReport,
  DatabaseInspectReport,
  FeaturesInspectReport,
  DependenciesInspectReport,
} from './types.js'
import { colors } from '../../ui/theme.js'

export function formatProjectInspect(report: ProjectInspectReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Project Inspection'))}\n`)

  console.log(`${colors.bold('Project')}\n`)
  console.log(`${colors.dim('name:')}`)
  console.log(`${report.projectName}\n`)

  console.log(`${colors.bold('Solarch Version:')}\n`)
  console.log(`${report.solarchVersion}\n`)

  console.log(`${colors.bold('Configuration:')}\n`)
  console.log(`${report.configFile}\n`)

  console.log(`${colors.bold('Runtime:')}\n`)
  console.log(`${report.nodeVersion}\n`)

  console.log(`${colors.bold('Environment:')}\n`)
  console.log(`${report.environment}\n`)
}

export function formatDatabaseInspect(report: DatabaseInspectReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Database Inspection'))}\n`)

  console.log(`${colors.bold('Provider:')}\n`)
  console.log(`${report.provider}\n`)

  if (report.storage) {
    console.log(`${colors.bold('Storage:')}\n`)
    console.log(`${report.storage}\n`)
  }

  if (report.host) {
    console.log(`${colors.bold('Host:')}\n`)
    console.log(`${report.host}\n`)
  }

  if (report.database) {
    console.log(`${colors.bold('Database:')}\n`)
    console.log(`${report.database}\n`)
  }

  if (report.url) {
    console.log(`${colors.bold('URL:')}\n`)
    console.log(`${report.url}\n`)
  }

  console.log(`${colors.bold('Status:')}\n`)
  console.log(`${report.status}\n`)

  console.log(`${colors.bold('Capabilities:')}\n`)
  for (const cap of report.capabilities) {
    console.log(`${colors.green('✔')} ${cap}`)
  }
  console.log('')
}

export function formatFeaturesInspect(report: FeaturesInspectReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Enabled Features'))}\n`)

  console.log(`${colors.bold('Authentication')}`)
  for (const p of report.auth.providers) {
    console.log(`  ${colors.green('✔')} ${p}`)
  }
  console.log('')

  console.log(`${colors.bold('Storage')}`)
  console.log(`  ${colors.green('✔')} ${report.storage.type}\n`)

  console.log(`${colors.bold('Realtime')}`)
  console.log(`  ${report.realtime.enabled ? colors.green('✔ enabled') : colors.red('✖ disabled')}\n`)

  console.log(`${colors.bold('AI')}`)
  console.log(`  ${report.ai.enabled ? colors.green('✔ enabled') : colors.red('✖ disabled')}\n`)

  console.log(`${colors.bold('Hooks')}`)
  console.log(`  ${report.hooks.enabled ? colors.green('✔ enabled') : colors.red('✖ disabled')}\n`)

  console.log(`${colors.bold('Rate Limiting')}`)
  console.log(`  ${report.rateLimiting.enabled ? colors.green('✔ enabled') : colors.red('✖ disabled')}\n`)
}

export function formatDependenciesInspect(report: DependenciesInspectReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Dependency Inspection'))}\n`)

  console.log(`${colors.bold('Node')}`)
  const nodeIcon = report.node.compatible ? colors.green('✔') : colors.red('✖')
  console.log(`  ${nodeIcon} ${report.node.version}\n`)

  console.log(`${colors.bold('Solarch')}`)
  console.log(`  ${colors.green('✔')} ${report.solarch.version}\n`)

  console.log(`${colors.bold('Database Driver')}`)
  const driverIcon = report.databaseDriver.available ? colors.green('✔') : colors.red('✖')
  console.log(`  ${driverIcon} ${report.databaseDriver.name}\n`)

  console.log(`${colors.bold('Core Client')}`)
  const clientIcon = report.coreClient.available ? colors.green('✔') : colors.yellow('⚠')
  console.log(`  ${clientIcon} ${report.coreClient.available ? `available${report.coreClient.version ? ` (v${report.coreClient.version})` : ''}` : 'not installed'}\n`)
}
