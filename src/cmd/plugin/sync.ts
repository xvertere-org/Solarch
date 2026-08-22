/**
 * Solarch CLI Plugin Sync Command (Phase 5)
 *
 * Implements `solarch plugin sync [--dry-run] [--yes]`
 * Reconciles plugin declarations from Dashboard PlatformProjectConfig with local manifest.
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { CapabilitiesClient } from '../../platform/client/capabilities.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { PluginRegistry } from '../../platform/plugins/registry.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface PluginSyncOptions {
  dryRun?: boolean
  yes?: boolean
  dir?: string
  token?: string
}

export async function runPluginSync(options: PluginSyncOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const s = createSpinner()
  s.start('Fetching remote plugin requirements from Solarch Platform...')

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    s.stop('Authentication failed.')
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const capClient = new CapabilitiesClient(new PlatformClient(config))
  const remoteConfig = await capClient.getProjectConfig(
    manifest.platform.projectId,
    resolved.credentials.accessToken
  )

  s.stop('Remote plugin requirements fetched.')

  const remotePluginNames = (remoteConfig.pluginRequirements || []).map((p) =>
    PluginRegistry.normalizeId(p.name)
  )
  const localPlugins = new Set((manifest.plugins?.list || []).map((p) => PluginRegistry.normalizeId(p)))

  const missingLocally: string[] = []
  for (const remotePlugin of remotePluginNames) {
    if (!localPlugins.has(remotePlugin)) {
      missingLocally.push(remotePlugin)
    }
  }

  console.log(colors.bold('\n⚡ Solarch Plugin Declaration Reconciliation\n'))

  if (missingLocally.length === 0) {
    output.success('All remote plugin declarations are already synchronized in project manifest.\n')
    return
  }

  console.log(`  ${colors.yellow('•')} Remote requires: ${missingLocally.join(', ')}`)

  if (options.dryRun) {
    console.log(colors.yellow('\n[DRY RUN] Would update local manifest with missing plugin declarations.\n'))
    return
  }

  for (const plugin of missingLocally) {
    localPlugins.add(plugin)
  }

  manifest.plugins = {
    mode: manifest.plugins?.mode || 'opt-in',
    list: Array.from(localPlugins),
  }
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  output.success(`Successfully synchronized plugin declarations (${colors.bold(missingLocally.join(', '))}).\n`)
}
