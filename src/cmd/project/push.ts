/**
 * Solarch CLI Project Push Command (Phase 4)
 *
 * Implements `solarch project push [--dry-run] [--yes]`
 * Pushes local capability intent and SDK requirements to Dashboard with optimistic concurrency.
 */

import { confirm as clackConfirm, isCancel, cancel, spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { CapabilitiesClient } from '../../platform/client/capabilities.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { BaseSnapshotStore } from '../../platform/state/base-snapshot.js'
import { ThreeWayDiffer } from '../../platform/reconciliation/differ.js'
import { PlatformProjectConfig } from '../../platform/schema/project-config.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ProjectPushOptions {
  dryRun?: boolean
  yes?: boolean
  dir?: string
  token?: string
}

export async function runProjectPush(options: ProjectPushOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const s = createSpinner()
  s.start('Checking local state and verifying remote concurrency revision...')

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

  const base = await BaseSnapshotStore.getBase(projectDir)
  const diffResult = ThreeWayDiffer.diff(base, manifest, remoteConfig)

  s.stop('State checked.')

  // Optimistic concurrency check
  if (base && remoteConfig.configVersion > base.configVersion) {
    output.failure(
      `Remote configuration has advanced to v${remoteConfig.configVersion} (local base is v${base.configVersion}).`
    )
    console.log(colors.yellow('  Run "solarch project pull" to reconcile remote changes before pushing.\n'))
    throw new Error('Concurrency conflict')
  }

  if (diffResult.localChangesCount === 0 && diffResult.isUpToDate) {
    output.success('No local configuration changes to push (already up to date).\n')
    return
  }

  if (options.dryRun) {
    console.log(colors.yellow('\n[DRY RUN] Would push the following local declarations to Dashboard:\n'))
    for (const entry of diffResult.entries) {
      if (entry.localValue !== entry.baseValue) {
        console.log(`  PUSH: ${entry.field} (${JSON.stringify(entry.localValue)})`)
      }
    }
    console.log('')
    return
  }

  if (!options.yes) {
    const confirmed = await clackConfirm({
      message: `Push local capability declarations to Solarch Platform (v${remoteConfig.configVersion})?`,
      initialValue: true,
    })
    if (isCancel(confirmed) || !confirmed) {
      cancel('Push cancelled.')
      return
    }
  }

  s.start('Pushing configuration to Solarch Platform...')

  // Filter to explicitly pushable fields only
  const updatePayload: Partial<PlatformProjectConfig> = {
    configVersion: remoteConfig.configVersion,
    sdkRequirements: (manifest.sdks || []).map((sdk) => ({ sdk, required: true })),
    pluginRequirements: (manifest.plugins?.list || []).map((name) => ({ name })),
  }

  const updatedRemote = await capClient.updateProjectConfig(
    manifest.platform.projectId,
    updatePayload,
    resolved.credentials.accessToken
  )

  // Update base snapshot
  await BaseSnapshotStore.saveBase(projectDir, updatedRemote)

  s.stop('Configuration pushed.')
  output.success(`Successfully pushed configuration to Solarch Platform (v${updatedRemote.configVersion}).\n`)
}
