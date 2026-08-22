/**
 * Solarch CLI Database Sync Command (Phase 6)
 *
 * Implements `solarch db sync [--env <env>] [--dry-run] [--yes]`
 * Reconciles remote database topology and provider settings into .solarch/project.json.
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DatabaseProvisionClient } from '../../platform/database/client.js'
import { DatabaseTopologyMatcher } from '../../platform/database/topology-matcher.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DbSyncOptions {
  env?: string
  dryRun?: boolean
  yes?: boolean
  dir?: string
  token?: string
}

export async function runDbSync(options: DbSyncOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const s = createSpinner()
  s.start(`Fetching remote database configuration for [${environment}]...`)

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    s.stop('Authentication failed.')
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const dbClient = new DatabaseProvisionClient(new PlatformClient(config))
  const remoteTopology = await dbClient.getTopology(
    manifest.platform.projectId,
    environment,
    resolved.credentials.accessToken
  )

  s.stop('Remote database configuration retrieved.')

  const match = DatabaseTopologyMatcher.compare(manifest, remoteTopology)

  console.log(colors.bold(`\n⚡ Database Topology Reconciliation [Environment: ${environment}]\n`))

  if (match.inSync) {
    output.success('Local database configuration is already aligned with remote platform target.\n')
    return
  }

  console.log('  Detected changes:')
  for (const diff of match.differences) {
    console.log(`    • ${diff}`)
  }

  if (options.dryRun) {
    console.log(colors.yellow('\n[DRY RUN] Would update local manifest with remote database settings.\n'))
    return
  }

  manifest.database = {
    engine: remoteTopology.engine,
    provider: remoteTopology.provider,
    topology: remoteTopology.topology,
    capabilities: manifest.database?.capabilities || {},
    source: 'platform',
  }
  manifest.updatedAt = new Date().toISOString()
  await ProjectMetadata.writeManifest(projectDir, manifest)

  output.success('Successfully updated local project manifest with remote database configuration.')
  if (match.migrationRequired) {
    console.log(colors.yellow('\n⚠ Database engine changed. Migration required. Run "solarch migrate".\n'))
  } else {
    console.log('')
  }
}
