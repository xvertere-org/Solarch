/**
 * Solarch CLI SDK Remove Command (Phase 3)
 *
 * Implements `solarch sdk remove <packages...> [--manager <pm>]`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { SdkInstaller } from '../../platform/sdk/installer.js'
import { PackageManagerType } from '../../platform/sdk/types.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface SdkRemoveOptions {
  packages: string[]
  manager?: string
  dir?: string
}

export async function runSdkRemove(options: SdkRemoveOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()

  if (!options.packages || options.packages.length === 0) {
    output.failure('Please specify one or more Solarch SDK packages to remove.')
    throw new Error('No packages specified')
  }

  const s = createSpinner()
  s.start(`Removing ${options.packages.join(', ')}...`)

  try {
    const { command } = await SdkInstaller.removeSdks(projectDir, options.packages, {
      manager: options.manager as PackageManagerType,
      updateManifest: true,
    })

    s.stop('Packages removed.')
    output.success(
      `Successfully removed ${colors.bold(options.packages.join(', '))} (${colors.dim(command)})`
    )
  } catch (err: any) {
    s.stop('Removal failed.')
    output.failure(`Failed to remove SDKs: ${err.message}`)
    throw err
  }
}
