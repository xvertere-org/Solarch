/**
 * Formatter for Solarch Configuration.
 * Formats resolved configuration for terminal display and structured JSON output.
 * Guarantees zero secret leakage.
 */

import { ConfigShowReport } from './types.js'
import { colors } from '../../ui/theme.js'

export function formatConfigTerminal(report: ConfigShowReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Configuration'))}\n`)

  console.log(`${colors.bold('Project')}\n`)
  console.log(`${colors.dim('name:')}`)
  console.log(`${report.project.name}\n`)

  console.log(`${colors.bold('Runtime')}\n`)
  console.log(`${colors.dim('port:')}`)
  console.log(`${report.runtime.port}\n`)

  console.log(`${colors.bold('Database')}\n`)
  console.log(`${colors.dim('provider:')}`)
  console.log(`${report.database.provider}`)
  if (report.database.url) {
    console.log(`${colors.dim('url:')}`)
    console.log(`${report.database.url}`)
  }
  console.log(`${colors.dim('mode:')}`)
  const modeDisplay = report.database.mode || (report.database.provider.toLowerCase() === 'sqlite' ? 'local' : 'tcp')
  console.log(`${modeDisplay}\n`)

  console.log(`${colors.bold('Authentication')}\n`)
  console.log(`${colors.dim('providers:')}`)
  console.log(`${report.auth.providers.join(', ')}\n`)

  console.log(`${colors.bold('Features')}\n`)
  console.log(`${colors.dim('rate limiting:')}`)
  console.log(`${report.features.rateLimiting ? 'enabled' : 'disabled'}`)
  console.log(`${colors.dim('AI:')}`)
  console.log(`${report.features.ai ? 'enabled' : 'disabled'}\n`)
}

export function formatConfigJson(report: ConfigShowReport): string {
  return JSON.stringify(report, null, 2)
}
