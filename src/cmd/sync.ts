/**
 * Solarch CLI Sync Command (Phase 3)
 *
 * Implements `solarch sync [--dry-run] [--env <env>] [--force] [--json]`
 * Synchronizes Dashboard platform configuration into local .env (mode 0o600) and manifest.
 * NOTE: Configuration sync only. Dependency package installation is handled by `solarch sdk sync`.
 */

import { spinner as createSpinner } from '@clack/prompts'
import { SyncService } from '../platform/sync/sync-service.js'
import { EnvironmentTarget, SyncResult } from '../platform/sync/types.js'
import { output } from '../ui/output.js'
import { colors } from '../ui/theme.js'

export interface CliSyncOptions {
  env?: string
  dryRun?: boolean
  force?: boolean
  json?: boolean
  dir?: string
  token?: string
  syncService?: SyncService
}

export async function runSync(options: CliSyncOptions = {}): Promise<SyncResult> {
  const syncService = options.syncService ?? new SyncService()
  const s = createSpinner()

  if (!options.json) {
    s.start('Connecting to Solarch Platform and fetching project configuration...')
  }

  try {
    const result = await syncService.sync({
      environment: (options.env as EnvironmentTarget) || 'development',
      dryRun: options.dryRun,
      force: options.force,
      dir: options.dir,
      token: options.token,
    })

    if (!options.json) {
      s.stop('Configuration loaded.')
    }

    if (options.json) {
      const jsonReport = {
        projectId: result.projectId,
        orgId: result.orgId,
        environment: result.environment,
        dryRun: result.dryRun,
        envChanges: result.envChanges,
        missingSdks: result.missingSdks,
        manifestUpdated: result.manifestUpdated,
      }
      console.log(JSON.stringify(jsonReport, null, 2))
      return result
    }

    // Text / UI Formatting
    console.log(colors.bold(`\n⚡ Solarch Project Configuration Sync (${result.environment})\n`))

    if (result.dryRun) {
      console.log(colors.yellow('  [DRY RUN] Previewing configuration changes without modifying files.\n'))
    }

    console.log(`  ${colors.bold('Project:')}      ${colors.cyan(result.projectId)} (Org: ${result.orgId})`)
    console.log(`  ${colors.bold('Environment:')}  ${result.environment}`)
    console.log('')

    // Environment changes
    console.log(colors.bold('  Environment Variables (.env):'))
    if (result.envChanges.added.length > 0) {
      console.log(`    ${colors.green('+')} Added:     ${result.envChanges.added.join(', ')}`)
    }
    if (result.envChanges.updated.length > 0) {
      console.log(`    ${colors.yellow('~')} Updated:   ${result.envChanges.updated.join(', ')}`)
    }
    if (result.envChanges.preserved.length > 0) {
      console.log(`    ${colors.dim('•')} Preserved: ${result.envChanges.preserved.length} local variable(s)`)
    }
    if (result.envChanges.added.length === 0 && result.envChanges.updated.length === 0) {
      console.log(`    ${colors.dim('No remote environment variable changes.')}`)
    }
    console.log('')

    // Manifest update
    if (result.manifestUpdated) {
      output.success('Updated local manifest (.solarch/project.json)')
    }

    // SDK status & recommendations
    if (result.missingSdks.length > 0) {
      console.log('')
      output.warning(
        `Missing required SDK dependencies: ${colors.bold(result.missingSdks.join(', '))}`
      )
      console.log(
        `  Run ${colors.cyan('solarch sdk sync')} to install required SDK packages.\n`
      )
    } else {
      console.log('')
      output.success('All required SDK packages are installed and up to date.\n')
    }

    return result
  } catch (err: any) {
    if (!options.json) {
      s.stop('Sync failed.')
      output.failure(`Sync failed: ${err.message}`)
    }
    throw err
  }
}
