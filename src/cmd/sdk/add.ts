/**
 * Solarch CLI SDK Add Command (Phase 3)
 *
 * Implements `solarch sdk add <packages...> [--manager <pm>] [--dev]`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { SdkInstaller } from '../../platform/sdk/installer.js'
import { PackageManagerType } from '../../platform/sdk/types.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface SdkAddOptions {
  packages: string[]
  manager?: string
  dev?: boolean
  dir?: string
  dryRun?: boolean
}

export async function runSdkAdd(options: SdkAddOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()

  if (!options.packages || options.packages.length === 0) {
    output.failure('Please specify one or more Solarch SDK packages to add.')
    throw new Error('No packages specified')
  }

  const s = createSpinner()
  s.start(`Installing ${options.packages.join(', ')}...`)

  try {
    if (options.dryRun) {
      s.stop('Dry run complete.')
      console.log(`[DRY RUN] Would install: ${options.packages.join(', ')}`)
      return
    }

    const { command } = await SdkInstaller.installSdks(projectDir, options.packages, {
      manager: options.manager as PackageManagerType,
      isDev: options.dev,
      updateManifest: true,
    })

    s.stop('Packages installed.')
    output.success(
      `Successfully added ${colors.bold(options.packages.join(', '))} (${colors.dim(command)})`
    )
  } catch (err: any) {
    s.stop('Installation failed.')
    output.failure(`Failed to install SDKs: ${err.message}`)
    throw err
  }
}
