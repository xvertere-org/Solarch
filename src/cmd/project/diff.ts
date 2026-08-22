/**
 * Solarch CLI Project Diff Command (Phase 4)
 *
 * Implements `solarch project diff [--json] [--env <env>]`
 * Computes true 3-way diff between BASE snapshot, LOCAL manifest, and REMOTE Dashboard config.
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { CapabilitiesClient } from '../../platform/client/capabilities.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { BaseSnapshotStore } from '../../platform/state/base-snapshot.js'
import { ThreeWayDiffer } from '../../platform/reconciliation/differ.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ProjectDiffOptions {
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runProjectDiff(options: ProjectDiffOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const s = createSpinner()
  if (!options.json) {
    s.start('Fetching remote configuration and comparing state...')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    if (!options.json) s.stop('Authentication failed.')
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const capClient = new CapabilitiesClient(new PlatformClient(config))
  const remoteConfig = await capClient.getProjectConfig(
    manifest.platform.projectId,
    resolved.credentials.accessToken,
    options.env || 'development'
  )

  const base = await BaseSnapshotStore.getBase(projectDir)
  const diffResult = ThreeWayDiffer.diff(base, manifest, remoteConfig)

  if (!options.json) {
    s.stop('Comparison complete.')
  }

  if (options.json) {
    console.log(JSON.stringify(diffResult, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch Project 3-Way State Comparison\n'))
  console.log(`  ${colors.bold('Project ID:')}    ${colors.cyan(manifest.platform.projectId)}`)
  console.log(`  ${colors.bold('Remote Rev:')}    v${remoteConfig.configVersion}`)
  console.log(`  ${colors.bold('Base Snapshot:')} ${base ? `v${base.configVersion}` : colors.dim('none (initial)')}\n`)

  if (diffResult.isUpToDate) {
    output.success('Local project state is fully synchronized with Solarch Platform.\n')
    return
  }

  for (const entry of diffResult.entries) {
    const statusIcon = entry.isConflict
      ? colors.red('✖ CONFLICT')
      : entry.type === 'added'
      ? colors.green('+ REMOTE ADD')
      : colors.yellow('~ MODIFIED')

    console.log(`  ${statusIcon} ${colors.bold(entry.field)}`)
    console.log(`    ${colors.dim('Base:')}   ${JSON.stringify(entry.baseValue ?? null)}`)
    console.log(`    ${colors.dim('Local:')}  ${JSON.stringify(entry.localValue ?? null)}`)
    console.log(`    ${colors.dim('Remote:')} ${JSON.stringify(entry.remoteValue ?? null)}`)
    console.log('')
  }
}
