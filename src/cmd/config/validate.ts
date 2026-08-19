/**
 * Solarch CLI: solarch config validate
 * Validates configuration syntax, required fields, database connectivity, and security requirements.
 * Reuses the core doctor engine to avoid duplicated validation logic.
 */

import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { ConfigValidateOptions, ConfigValidateReport, ConfigValidationCheck } from './types.js'
import { runDoctor } from '../doctor.js'
import { runEnvCheck } from '../env/check.js'
import { colors } from '../../ui/theme.js'

export async function runConfigValidate(opts: ConfigValidateOptions = {}): Promise<ConfigValidateReport> {
  const cwd = path.resolve(opts.dir || '.')
  const checks: ConfigValidationCheck[] = []

  // 1. Run Env Check for detailed security and secret presence
  const envReport = await runEnvCheck({
    dir: cwd,
    silent: true,
    exitOnComplete: false,
  } as any)

  // 2. Run Doctor for database connectivity and system health
  const doctorReport = await runDoctor({
    cwd,
    silent: true,
    exitOnComplete: false,
  })

  // 3. Synthesize checks into 4 core validation domains:

  // Domain A: Config File
  const configDocCheck = doctorReport.checks.find(c => c.id === 'config_file')
  if (configDocCheck && configDocCheck.status === 'fail') {
    checks.push({
      id: 'config_file',
      name: 'Config file',
      status: 'fail',
      message: configDocCheck.message,
    })
  } else {
    checks.push({
      id: 'config_file',
      name: 'Config file',
      status: 'pass',
      message: 'valid',
    })
  }

  // Domain B: Environment
  if (envReport.valid) {
    checks.push({
      id: 'environment',
      name: 'Environment',
      status: 'pass',
      message: 'complete',
    })
  } else {
    const failedEnvChecks = envReport.checks.filter(c => c.status === 'fail')
    checks.push({
      id: 'environment',
      name: 'Environment',
      status: 'fail',
      message: failedEnvChecks.map(c => `${c.name}: ${c.message}`).join(', ') || 'incomplete environment configuration',
    })
  }

  // Domain C: Database
  const dbDocCheck = doctorReport.checks.find(c => c.id === 'database_connectivity')
  const envDbCheck = envReport.checks.find(c => c.id === 'database_url' || c.id === 'database_storage')

  if (envDbCheck && envDbCheck.status === 'fail') {
    checks.push({
      id: 'database',
      name: 'Database',
      status: 'fail',
      message: envDbCheck.message,
    })
  } else if (dbDocCheck && dbDocCheck.status === 'fail') {
    checks.push({
      id: 'database',
      name: 'Database',
      status: 'fail',
      message: dbDocCheck.message,
    })
  } else {
    checks.push({
      id: 'database',
      name: 'Database',
      status: 'pass',
      message: 'reachable',
    })
  }

  // Domain D: Security
  const jwtCheck = envReport.checks.find(c => c.id === 'jwt_secret')
  const encCheck = envReport.checks.find(c => c.id === 'encryption_key')

  if (jwtCheck?.status === 'fail' || encCheck?.status === 'fail') {
    const secIssues = [jwtCheck, encCheck]
      .filter(c => c?.status === 'fail')
      .map(c => `${c?.name} ${c?.message}`)
      .join(', ')

    checks.push({
      id: 'security',
      name: 'Security',
      status: 'fail',
      message: secIssues || 'missing required cryptographic secrets',
    })
  } else {
    checks.push({
      id: 'security',
      name: 'Security',
      status: 'pass',
      message: 'secrets configured',
    })
  }

  const isValid = checks.every(c => c.status !== 'fail')

  const report: ConfigValidateReport = {
    timestamp: new Date().toISOString(),
    valid: isValid,
    checks,
  }

  // Presentation
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('⚡ Configuration Validation'))}\n`)

    for (const check of checks) {
      const icon = check.status === 'pass'
        ? colors.green('✔')
        : check.status === 'warn'
        ? colors.yellow('⚠')
        : colors.red('✖')

      console.log(`${icon} ${colors.bold(check.name)}`)
      console.log(`  ${check.message}\n`)
    }

    if (report.valid) {
      console.log(colors.green('Configuration ready.\n'))
    } else {
      console.log(colors.red('Configuration validation failed.\n'))
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(isValid ? 0 : 1)
  }

  return report
}
