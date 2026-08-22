/**
 * Solarch CLI Plugin List Command (Phase 5)
 *
 * Implements `solarch plugin list [--json]`
 */

import { PluginRegistry } from '../../platform/plugins/registry.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { colors } from '../../ui/theme.js'

export interface PluginListOptions {
  json?: boolean
  dir?: string
}

export async function runPluginList(options: PluginListOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir).catch(() => null)
  const installedList = new Set(manifest?.plugins?.list || [])

  const officialPlugins = PluginRegistry.getAll()

  if (options.json) {
    const list = officialPlugins.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      description: p.description,
      category: p.category,
      source: p.source,
      publisher: p.publisher,
      installed: installedList.has(p.id) || installedList.has(p.name),
    }))
    console.log(JSON.stringify(list, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch Plugin Catalog\n'))

  for (const plugin of officialPlugins) {
    const isInstalled = installedList.has(plugin.id) || installedList.has(plugin.name)
    const statusTag = isInstalled
      ? colors.green('✔ installed')
      : colors.dim('• available')

    console.log(`  ${colors.bold(plugin.id.padEnd(32, ' '))} ${statusTag}  ${colors.dim(`[${plugin.category}]`)}`)
    console.log(`    ${colors.dim(plugin.description)}`)
    console.log('')
  }
}
