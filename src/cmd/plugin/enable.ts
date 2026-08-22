/**
 * Solarch CLI Plugin Enable & Disable Commands (Phase 5)
 */

import { PluginRegistry } from '../../platform/plugins/registry.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface PluginToggleOptions {
  plugin: string
  dir?: string
}

export async function runPluginEnable(options: PluginToggleOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found.')
    throw new Error('Manifest not found')
  }

  const canonicalId = PluginRegistry.normalizeId(options.plugin)
  const existingList = new Set(manifest.plugins?.list || [])

  if (!existingList.has(canonicalId) && !existingList.has(PluginRegistry.getShortName(canonicalId))) {
    existingList.add(canonicalId)
    manifest.plugins.list = Array.from(existingList)
    manifest.updatedAt = new Date().toISOString()
    await ProjectMetadata.writeManifest(projectDir, manifest)
  }

  output.success(`Plugin ${colors.bold(canonicalId)} is enabled.\n`)
}

export async function runPluginDisable(options: PluginToggleOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found.')
    throw new Error('Manifest not found')
  }

  const canonicalId = PluginRegistry.normalizeId(options.plugin)
  const shortName = PluginRegistry.getShortName(canonicalId)

  manifest.plugins.list = (manifest.plugins?.list || []).filter(
    (p) => p !== canonicalId && p !== shortName
  )
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  output.success(`Plugin ${colors.bold(canonicalId)} is disabled.\n`)
}
