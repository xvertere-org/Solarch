/**
 * Solarch CLI Status Command
 * Provides a runtime health overview by reusing the core doctor diagnostics engine.
 */

import path from 'path'
import { runDoctor, DoctorReport, DoctorCheckResult } from './doctor.js'
import { colors } from '../ui/theme.js'

export interface StatusOptions {
  dir?: string
  json?: boolean
  exitOnComplete?: boolean
}

export interface StatusSummaryCheck {
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export interface StatusReport {
  timestamp: string
  overallStatus: 'healthy' | 'warning' | 'unhealthy'
  checks: {
    runtime: StatusSummaryCheck
    configuration: StatusSummaryCheck
    database: StatusSummaryCheck
    migrations: StatusSummaryCheck
    superuser: StatusSummaryCheck
  }
}

function getCheckIcon(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return colors.green('✔')
    case 'warn':
      return colors.yellow('⚠')
    case 'fail':
    default:
      return colors.red('✖')
  }
}

/**
 * Runs runtime diagnostics via doctor and outputs health summary
 */
export async function runStatus(opts: StatusOptions = {}): Promise<StatusReport> {
  const cwd = path.resolve(opts.dir || '.')

  // 1. Reuse existing doctor implementation without duplication
  const doctorReport: DoctorReport = await runDoctor({
    cwd,
    silent: true,
    exitOnComplete: false,
  })

  // 2. Map doctor checks to status domains
  const findCheck = (id: string): DoctorCheckResult | undefined =>
    doctorReport.checks.find(c => c.id === id)

  const runtimeCheck = findCheck('node_runtime') || { status: 'pass', message: 'Compatible' }
  const configCheck = findCheck('config_file') || findCheck('config_resolution') || { status: 'pass', message: 'Valid' }
  const dbCheck = findCheck('database_connectivity') || { status: 'pass', message: 'Connected' }
  const migrationsCheck = findCheck('migrations') || { status: 'pass', message: 'Up to date' }
  const superuserCheck = findCheck('superuser') || { status: 'warn', message: 'No superuser account exists' }

  const report: StatusReport = {
    timestamp: doctorReport.timestamp,
    overallStatus: doctorReport.overallStatus,
    checks: {
      runtime: { status: runtimeCheck.status, message: runtimeCheck.message },
      configuration: { status: configCheck.status, message: configCheck.message },
      database: { status: dbCheck.status, message: dbCheck.message },
      migrations: { status: migrationsCheck.status, message: migrationsCheck.message },
      superuser: { status: superuserCheck.status, message: superuserCheck.message },
    },
  }

  const hasFailures = Object.values(report.checks).some(c => c.status === 'fail')

  // 3. Presentation
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Status'))}\n`)

    console.log(`${colors.dim('Runtime:')}`)
    console.log(`  ${getCheckIcon(report.checks.runtime.status)} ${report.checks.runtime.message}\n`)

    console.log(`${colors.dim('Configuration:')}`)
    console.log(`  ${getCheckIcon(report.checks.configuration.status)} ${report.checks.configuration.message}\n`)

    console.log(`${colors.dim('Database:')}`)
    console.log(`  ${getCheckIcon(report.checks.database.status)} ${report.checks.database.message}\n`)

    console.log(`${colors.dim('Migrations:')}`)
    console.log(`  ${getCheckIcon(report.checks.migrations.status)} ${report.checks.migrations.message}\n`)

    console.log(`${colors.dim('Superuser:')}`)
    console.log(`  ${getCheckIcon(report.checks.superuser.status)} ${report.checks.superuser.message}\n`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(hasFailures ? 1 : 0)
  }

  return report
}
