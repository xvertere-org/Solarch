/**
 * Solarch CLI Plugin Remove Command (Phase 5)
 *
 * Implements `solarch plugin remove <plugins...>`
 */

import { PluginRegistry } from '../../platform/plugins/registry.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface PluginRemoveOptions {
  plugins: string[]
  dir?: string
}

export async function runPluginRemove(options: PluginRemoveOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()

  if (!options.plugins || options.plugins.length === 0) {
    output.failure('Please specify one or more plugin names or IDs to remove.')
    throw new Error('No plugins specified')
  }

  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found. Run "solarch init" first.')
    throw new Error('Manifest not found')
  }

  const toRemove = options.plugins.map((p) => PluginRegistry.normalizeId(p))
  const toRemoveShort = options.plugins.map((p) => PluginRegistry.getShortName(p))

  const existingList = manifest.plugins?.list || []
  const filtered = existingList.filter(
    (p) => !toRemove.includes(p) && !toRemoveShort.includes(p)
  )

  if (filtered.length === existingList.length) {
    output.success('None of the specified plugins were declared in the project manifest.')
    return
  }

  manifest.plugins.list = filtered
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  output.success(`Successfully removed plugin(s): ${colors.bold(options.plugins.join(', '))}\n`)
}
