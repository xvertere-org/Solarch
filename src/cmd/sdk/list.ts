/**
 * Solarch CLI SDK List Command (Phase 3)
 *
 * Implements `solarch sdk list [--json]`
 */

import { SdkInstaller } from '../../platform/sdk/installer.js'
import { colors } from '../../ui/theme.js'

export interface SdkListOptions {
  json?: boolean
  dir?: string
}

export async function runSdkList(options: SdkListOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const sdks = await SdkInstaller.listSdkStatus(projectDir)

  if (options.json) {
    console.log(JSON.stringify(sdks, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch Client SDK Catalog\n'))

  for (const sdk of sdks) {
    const statusIcon = sdk.installed
      ? colors.green('✔ installed')
      : sdk.required
      ? colors.yellow('⚠ required (not installed)')
      : colors.dim('• available')

    const versionStr = sdk.currentVersion ? colors.dim(`(${sdk.currentVersion})`) : ''

    console.log(`  ${colors.bold(sdk.name.padEnd(24, ' '))} ${statusIcon} ${versionStr}`)
    console.log(`    ${colors.dim(sdk.description)}`)
    console.log('')
  }
}
