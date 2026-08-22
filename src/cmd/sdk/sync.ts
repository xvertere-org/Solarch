/**
 * Solarch CLI SDK Sync Command (Phase 3)
 *
 * Implements `solarch sdk sync [--manager <pm>] [--dry-run] [--yes]`
 * Reconciles and provisions required SDK packages into local package.json.
 */

import { confirm as clackConfirm, isCancel, cancel, spinner as createSpinner } from '@clack/prompts'
import { SdkInstaller } from '../../platform/sdk/installer.js'
import { PackageManagerType } from '../../platform/sdk/types.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface SdkSyncOptions {
  manager?: string
  dryRun?: boolean
  yes?: boolean
  dir?: string
}

export async function runSdkSync(options: SdkSyncOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const pm = options.manager as PackageManagerType | undefined

  const plan = await SdkInstaller.computeSyncPlan(projectDir, pm)

  console.log(colors.bold('\n⚡ Solarch SDK Dependency Reconciliation\n'))
  console.log(`  ${colors.bold('Package Manager:')} ${colors.cyan(plan.packageManager)}`)

  if (plan.alreadyInstalled.length > 0) {
    console.log(`  ${colors.green('✔')} Already installed: ${plan.alreadyInstalled.join(', ')}`)
  }

  if (plan.isUpToDate) {
    console.log('')
    output.success('All required Solarch SDK dependencies are already installed and up to date.\n')
    return
  }

  console.log(`  ${colors.yellow('⚠')} Missing packages:   ${colors.bold(plan.toInstall.join(', '))}\n`)

  if (options.dryRun) {
    console.log(colors.yellow('[DRY RUN] Would install missing packages via ' + plan.packageManager + '\n'))
    return
  }

  if (!options.yes) {
    const confirmed = await clackConfirm({
      message: `Install ${plan.toInstall.join(', ')} using ${plan.packageManager}?`,
      initialValue: true,
    })
    if (isCancel(confirmed) || !confirmed) {
      cancel('SDK sync cancelled.')
      return
    }
  }

  const s = createSpinner()
  s.start(`Installing missing SDK packages (${plan.toInstall.join(', ')})...`)

  try {
    const { command } = await SdkInstaller.installSdks(projectDir, plan.toInstall, {
      manager: plan.packageManager,
      updateManifest: false, // already declared in manifest
    })
    s.stop('Packages installed.')
    output.success(`Successfully reconciled SDK dependencies (${colors.dim(command)})\n`)
  } catch (err: any) {
    s.stop('Installation failed.')
    output.failure(`Failed to install SDK packages: ${err.message}`)
    throw err
  }
}
