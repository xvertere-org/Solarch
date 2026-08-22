/**
 * Solarch CLI Database Status Command (Phase 6)
 *
 * Implements `solarch db status [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DatabaseProvisionClient } from '../../platform/database/client.js'
import { DatabaseTopologyMatcher } from '../../platform/database/topology-matcher.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DbStatusOptions {
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runDbStatus(options: DbStatusOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest) {
    output.failure('No Solarch project manifest found. Run "solarch init" first.')
    throw new Error('Manifest not found')
  }

  let remoteTopology: any = null
  let matchResult: any = null

  if (manifest.platform?.projectId) {
    const config = PlatformConfig.default()
    const authService = new AuthService(config)
    const resolved = await authService.resolveSession(options.token)

    if (resolved.session.isAuthenticated() && resolved.credentials?.accessToken) {
      try {
        const dbClient = new DatabaseProvisionClient(new PlatformClient(config))
        remoteTopology = await dbClient.getTopology(
          manifest.platform.projectId,
          environment,
          resolved.credentials.accessToken
        )
        matchResult = DatabaseTopologyMatcher.compare(manifest, remoteTopology)
      } catch (err: any) {
        // Remote topology not yet configured or unreachable
      }
    }
  }

  if (options.json) {
    const result = {
      environment,
      local: {
        engine: manifest.database.engine,
        provider: manifest.database.provider || 'local',
        topology: manifest.database.topology,
        source: manifest.database.source,
      },
      remote: remoteTopology,
      inSync: matchResult ? matchResult.inSync : null,
      differences: matchResult ? matchResult.differences : [],
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Solarch Database Topology & Status [Environment: ${environment}]\n`))

  console.log(colors.bold('  Local Database Configuration:'))
  console.log(`    • Engine:   ${colors.cyan(manifest.database.engine)}`)
  console.log(`    • Provider: ${manifest.database.provider || 'local'}`)
  console.log(`    • Topology: ${manifest.database.topology}`)
  console.log(`    • Source:   ${manifest.database.source || 'intent'}\n`)

  if (remoteTopology) {
    console.log(colors.bold('  Remote Platform Database Target:'))
    console.log(`    • Engine:   ${colors.cyan(remoteTopology.engine)}`)
    console.log(`    • Provider: ${remoteTopology.provider}`)
    console.log(`    • Topology: ${remoteTopology.topology}`)
    if (remoteTopology.host) {
      console.log(`    • Host:     ${remoteTopology.host}`)
    }
    console.log(`    • Secret:   ${remoteTopology.secretRefs?.join(', ') || 'DATABASE_URL'}\n`)

    if (matchResult?.inSync) {
      output.success('Local configuration is in sync with remote platform target.\n')
    } else if (matchResult?.differences.length > 0) {
      console.log(colors.yellow('  Topology Differences:'))
      for (const diff of matchResult.differences) {
        console.log(`    ⚠ ${diff}`)
      }
      console.log(`\n  Run ${colors.cyan('solarch db sync')} to align local configuration.\n`)
    }
  } else {
    console.log(colors.dim('  Remote platform database: not linked or offline.\n'))
  }
}
