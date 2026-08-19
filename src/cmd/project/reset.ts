/**
 * Solarch CLI: solarch project reset
 * Resets local runtime state by wiping and recreating pb_data, then running doctor validation.
 */

import fs from 'fs'
import path from 'path'
import { ProjectResetOptions, ProjectResetResult } from './types.js'
import { formatProjectReset } from './formatter.js'
import { promptConfirm } from '../../ui/prompts/confirm.js'
import { runDoctor } from '../doctor.js'
import { colors } from '../../ui/theme.js'

export async function runProjectReset(opts: ProjectResetOptions = {}): Promise<ProjectResetResult> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const isInteractive = Boolean(process.stdout.isTTY && !process.env.CI)

  if (!opts.yes) {
    if (isInteractive) {
      console.log(`\n${colors.bold(colors.cyan('⚡ Resetting Project'))}\n`)
      console.log(`${colors.yellow('⚠ This removes local database state.')}\n`)

      const confirmed = await promptConfirm({
        message: 'Reset and recreate local database runtime?',
        initialValue: false,
      })

      if (!confirmed) {
        console.log(colors.dim('\nOperation cancelled. No state was modified.\n'))
        if (opts.exitOnComplete ?? true) {
          process.exit(0)
        }
        return {
          reset: false,
          databaseRemoved: false,
          runtimeRecreated: false,
          doctorValidated: false,
        }
      }
    } else {
      const errorMsg = 'Confirmation required in non-interactive mode. Use --yes.'
      if (opts.exitOnComplete ?? true) {
        console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
        process.exit(1)
      }
      throw new Error(errorMsg)
    }
  }

  // 1. Remove pb_data
  const dataDir = path.join(cwd, 'pb_data')
  let databaseRemoved = false
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true })
    databaseRemoved = true
  }

  // 2. Recreate pb_data
  fs.mkdirSync(dataDir, { recursive: true })
  const runtimeRecreated = true

  // 3. Run Doctor Validation
  const doctorReport = await runDoctor({
    cwd,
    silent: true,
    exitOnComplete: false,
  })

  const doctorValidated = doctorReport.checks.every(c => c.status !== 'fail')

  const result: ProjectResetResult = {
    reset: databaseRemoved && runtimeRecreated && doctorValidated,
    databaseRemoved,
    runtimeRecreated,
    doctorValidated,
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    formatProjectReset(result)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(doctorValidated ? 0 : 1)
  }

  return result
}
