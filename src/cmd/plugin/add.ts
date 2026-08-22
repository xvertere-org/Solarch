/**
 * Solarch CLI Plugin Add Command (Phase 5)
 *
 * Implements `solarch plugin add <plugins...> [--dry-run]`
 * Validates plugin requirements and updates .solarch/project.json without prompting for secrets.
 */

import { PluginResolver } from '../../platform/plugins/resolver.js'
import { PluginConfigManager } from '../../platform/plugins/config.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface PluginAddOptions {
  plugins: string[]
  dryRun?: boolean
  dir?: string
}

export async function runPluginAdd(options: PluginAddOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()

  if (!options.plugins || options.plugins.length === 0) {
    output.failure('Please specify one or more plugin names or IDs to add.')
    throw new Error('No plugins specified')
  }

  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found. Run "solarch init" first.')
    throw new Error('Manifest not found')
  }

  const resolved = PluginResolver.resolve(options.plugins)

  if (resolved.conflicts.length > 0) {
    output.failure(`Plugin conflicts detected:\n  ${resolved.conflicts.join('\n  ')}`)
    throw new Error('Plugin conflict')
  }

  const existingPlugins = new Set(manifest.plugins?.list || [])
  const newlyAdded: string[] = []

  for (const desc of resolved.descriptors) {
    if (!existingPlugins.has(desc.id) && !existingPlugins.has(desc.name)) {
      existingPlugins.add(desc.id)
      newlyAdded.push(desc.id)
    }
  }

  if (newlyAdded.length === 0) {
    output.success('All specified plugins are already declared in project manifest.')
    return
  }

  if (options.dryRun) {
    console.log(colors.yellow(`\n[DRY RUN] Would add plugins: ${newlyAdded.join(', ')}\n`))
    return
  }

  manifest.plugins = {
    mode: manifest.plugins?.mode || 'opt-in',
    list: Array.from(existingPlugins),
  }
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  output.success(`Successfully added plugin(s): ${colors.bold(newlyAdded.join(', '))}`)

  // Display environment requirements summary
  const requiredEnv = PluginConfigManager.getRequiredEnvList(resolved.descriptors)
  if (requiredEnv.length > 0) {
    console.log(colors.bold('\n  Next Steps — Configure Required Environment Variables:'))
    for (const req of requiredEnv) {
      console.log(`    • ${colors.cyan(req.key)}: ${req.description}`)
    }
    console.log(`\n  Configure values in ${colors.bold('.env')} or sync from Dashboard via ${colors.cyan('solarch sync')}.\n`)
  }
}
