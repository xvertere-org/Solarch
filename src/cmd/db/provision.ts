/**
 * Solarch CLI Database Provision Command (Phase 6)
 *
 * Implements `solarch db provision [--env <env>] [--provider <provider>] [--topology <topology>] [--dry-run]`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DatabaseProvisionClient } from '../../platform/database/client.js'
import { DatabaseProvisionOrchestrator } from '../../platform/database/provisioning.js'
import { DatabaseCompatibility } from '../../platform/database/compatibility.js'
import { DatabaseEngine, DatabaseProvider, DatabaseTopology } from '../../platform/database/types.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DbProvisionOptions {
  env?: string
  provider?: string
  topology?: string
  region?: string
  dryRun?: boolean
  dir?: string
  token?: string
}

export async function runDbProvision(options: DbProvisionOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const engine = manifest.database.engine as DatabaseEngine
  const provider = (options.provider ||
    DatabaseCompatibility.getDefaultProvider(engine)) as DatabaseProvider
  const topology = (options.topology ||
    DatabaseCompatibility.getDefaultTopology(engine, provider)) as DatabaseTopology

  // Validate compatibility matrix
  const compat = DatabaseCompatibility.validate(engine, provider, topology)
  if (!compat.compatible) {
    output.failure(compat.error || 'Incompatible database configuration.')
    throw new Error('Incompatible database configuration')
  }

  if (options.dryRun) {
    console.log(colors.yellow(`\n[DRY RUN] Would provision database on Solarch Platform:`))
    console.log(`  • Engine:      ${engine}`)
    console.log(`  • Provider:    ${provider}`)
    console.log(`  • Topology:    ${topology}`)
    console.log(`  • Environment: ${environment}`)
    console.log(`  • Region:      ${options.region || 'auto'}`)
    console.log(`\nNo remote infrastructure or local configuration modified.\n`)
    return
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const s = createSpinner()
  s.start(`Provisioning remote ${engine} database on ${provider} [${environment}]...`)

  try {
    const rawClient = new PlatformClient(config)
    const dbClient = new DatabaseProvisionClient(rawClient)
    const orchestrator = new DatabaseProvisionOrchestrator(dbClient)

    const op = await orchestrator.provisionAndAwait(
      {
        projectId: manifest.platform.projectId,
        environment,
        engine,
        provider,
        topology,
        region: options.region,
      },
      resolved.credentials.accessToken
    )

    s.stop(`Database provisioning ready.`)

    if (op.metadata) {
      await DatabaseProvisionOrchestrator.applyProvisionedDatabase(
        projectDir,
        manifest,
        op.metadata,
        environment,
        op.connectionSecret
      )
    }

    output.success(`Successfully provisioned remote ${engine} database (${provider} / ${topology}).`)
    console.log(colors.bold('\n  Next Steps:'))
    console.log(`    • Connection credentials written to ${colors.cyan('.env')}`)
    console.log(`    • Migration required. Run: ${colors.cyan('solarch migrate')}\n`)
  } catch (err: any) {
    s.stop(`Provisioning failed.`)
    output.failure(`Failed to provision database: ${err?.message || err}`)
    throw err
  }
}
