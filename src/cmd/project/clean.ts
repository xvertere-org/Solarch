/**
 * Solarch CLI: solarch project clean
 * Safely removes generated runtime artifacts while strictly preserving configs, .env, migrations, and source files.
 */

import fs from 'fs'
import path from 'path'
import { ProjectCleanOptions, ProjectCleanResult } from './types.js'
import { scanRemovableArtifacts } from './scanner.js'
import { formatProjectClean } from './formatter.js'
import { promptConfirm } from '../../ui/prompts/confirm.js'
import { colors } from '../../ui/theme.js'

export async function runProjectClean(opts: ProjectCleanOptions = {}): Promise<ProjectCleanResult> {
  const cwd = path.resolve(opts.dir || '.')

  if (!fs.existsSync(cwd)) {
    const errorMsg = `Project directory does not exist: ${cwd}`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const found = scanRemovableArtifacts(cwd)

  if (found.length === 0) {
    const emptyResult: ProjectCleanResult = {
      cleaned: false,
      removedPaths: [],
      skippedPaths: [],
    }

    if (opts.json) {
      console.log(JSON.stringify(emptyResult, null, 2))
    } else {
      console.log(`\n${colors.bold(colors.cyan('⚡ Cleaning Project'))}\n`)
      console.log(colors.dim('No removable runtime artifacts found.\n'))
    }

    if (opts.exitOnComplete ?? true) {
      process.exit(0)
    }

    return emptyResult
  }

  const isInteractive = Boolean(process.stdout.isTTY && !process.env.CI)

  if (!opts.yes) {
    if (isInteractive) {
      console.log(`\n${colors.bold(colors.cyan('⚡ Cleaning Project'))}\n`)
      console.log(`${colors.dim('Found:')}`)
      for (const item of found) {
        console.log(`  ${item}`)
      }
      console.log('')

      const confirmed = await promptConfirm({
        message: 'Continue removing runtime artifacts?',
        initialValue: false,
      })

      if (!confirmed) {
        console.log(colors.dim('\nOperation cancelled. No files were removed.\n'))
        if (opts.exitOnComplete ?? true) {
          process.exit(0)
        }
        return {
          cleaned: false,
          removedPaths: [],
          skippedPaths: found,
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

  // Remove targets safely
  const removedPaths: string[] = []
  for (const target of found) {
    const targetPath = path.join(cwd, target)
    try {
      fs.rmSync(targetPath, { recursive: true, force: true })
      removedPaths.push(target)
    } catch {}
  }

  const result: ProjectCleanResult = {
    cleaned: removedPaths.length > 0,
    removedPaths,
    skippedPaths: [],
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    formatProjectClean(result)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
