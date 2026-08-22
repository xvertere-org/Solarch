/**
 * Solarch CLI Plugin Info Command (Phase 5)
 *
 * Implements `solarch plugin info <plugin> [--json]`
 */

import { PluginRegistry } from '../../platform/plugins/registry.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface PluginInfoOptions {
  plugin: string
  json?: boolean
}

export async function runPluginInfo(options: PluginInfoOptions): Promise<void> {
  const plugin = PluginRegistry.get(options.plugin)

  if (!plugin) {
    output.failure(`Plugin "${options.plugin}" not found in official catalog.`)
    throw new Error('Plugin not found')
  }

  if (options.json) {
    console.log(JSON.stringify(plugin, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Plugin Details: ${plugin.title}\n`))
  console.log(`  ${colors.bold('ID:')}          ${colors.cyan(plugin.id)}`)
  console.log(`  ${colors.bold('Category:')}    ${plugin.category}`)
  console.log(`  ${colors.bold('Publisher:')}   ${plugin.publisher}`)
  console.log(`  ${colors.bold('Version:')}     ${plugin.version || '1.0.0'}`)
  console.log(`  ${colors.bold('Description:')} ${plugin.description}\n`)

  if (plugin.environmentRequirements.length > 0) {
    console.log(colors.bold('  Environment Requirements:'))
    for (const req of plugin.environmentRequirements) {
      const secTag = req.secret ? colors.yellow('(secret)') : colors.dim('(config)')
      const optTag = req.optional ? colors.dim('(optional)') : colors.bold('(required)')
      console.log(`    ${colors.cyan(req.key.padEnd(28, ' '))} ${secTag} ${optTag} - ${req.description}`)
    }
    console.log('')
  }

  if (plugin.hooks.length > 0) {
    console.log(`  ${colors.bold('Lifecycle Hooks:')} ${plugin.hooks.join(', ')}\n`)
  }
}
