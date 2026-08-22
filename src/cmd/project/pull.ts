/**
 * Solarch CLI Project Pull Command (Phase 4)
 *
 * Implements `solarch project pull [--force] [--dry-run] [--env <env>]`
 * Reconciles remote configuration into local manifest, state snapshot, and .env (0o600).
 */

import * as path from 'path'
import * as fs from 'fs'
import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { CapabilitiesClient } from '../../platform/client/capabilities.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { BaseSnapshotStore } from '../../platform/state/base-snapshot.js'
import { Reconciler } from '../../platform/reconciliation/reconciler.js'
import { EnvMerger } from '../../platform/sync/env-merger.js'
import { SdkInstaller } from '../../platform/sdk/installer.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ProjectPullOptions {
  env?: string
  force?: boolean
  dryRun?: boolean
  dir?: string
  token?: string
}

export async function runProjectPull(options: ProjectPullOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const s = createSpinner()
  s.start('Fetching remote configuration and reconciling state...')

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    s.stop('Authentication failed.')
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const capClient = new CapabilitiesClient(new PlatformClient(config))
  const targetEnv = options.env || 'development'
  const remoteConfig = await capClient.getProjectConfig(
    manifest.platform.projectId,
    resolved.credentials.accessToken,
    targetEnv
  )

  const base = await BaseSnapshotStore.getBase(projectDir)
  const plan = Reconciler.reconcile(base, manifest, remoteConfig, {
    force: options.force,
    strategy: options.force ? 'theirs' : 'safe',
  })

  s.stop('Reconciliation evaluated.')

  if (plan.diffResult.hasConflicts && !options.force) {
    output.failure('Conflicts detected between local manifest and remote platform configuration.')
    console.log(colors.yellow('  Use --force to overwrite local declarations with remote platform state.\n'))
    throw new Error('Sync conflict')
  }

  if (plan.isIdempotent) {
    output.success('Project configuration is already up to date.\n')
    return
  }

  if (options.dryRun) {
    console.log(colors.yellow('\n[DRY RUN] Previewing changes from remote platform:\n'))
    for (const entry of plan.diffResult.entries) {
      console.log(`  ${entry.type.toUpperCase()}: ${entry.field}`)
    }
    console.log('')
    return
  }

  // 1. Update manifest
  Object.assign(manifest, plan.manifestPatch)
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  // 2. Update base snapshot
  await BaseSnapshotStore.saveBase(projectDir, remoteConfig)

  // 3. Update .env (0o600)
  const envPath = path.join(projectDir, '.env')
  const existingEnv = fs.existsSync(envPath) ? await fs.promises.readFile(envPath, 'utf-8') : ''
  const envVars = (remoteConfig as any).envVars || {}
  const mergedEnv = EnvMerger.merge(existingEnv, envVars, {
    environment: targetEnv as any,
    force: options.force,
  })
  await EnvMerger.writeEnvFile(envPath, mergedEnv.content)

  output.success('Successfully pulled platform configuration and updated manifest.')

  // Check SDK status
  const installedDeps = SdkInstaller.readInstalledDependencies(projectDir)
  const missingSdks = (manifest.sdks || []).filter((sdk) => !(sdk in installedDeps))

  if (missingSdks.length > 0) {
    console.log('')
    output.warning(`Missing required SDK dependencies: ${missingSdks.join(', ')}`)
    console.log(`  Run ${colors.cyan('solarch sdk sync')} to install required packages.\n`)
  } else {
    console.log('')
  }
}
