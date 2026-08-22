/**
 * Solarch CLI Service Traffic Command (Phase 9)
 *
 * Implements `solarch service traffic --canary <id> --weight <0-100> [--force] [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { ServiceClient } from '../../platform/service/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ServiceTrafficCommandOptions {
  canary?: string
  weight?: number | string
  force?: boolean
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runServiceTraffic(options: ServiceTrafficCommandOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  if (!options.canary || options.weight === undefined) {
    output.failure('Specify both --canary <deploymentId> and --weight <0-100>.')
    throw new Error('Missing traffic arguments')
  }

  const weight = Number(options.weight)
  if (isNaN(weight) || weight < 0 || weight > 100) {
    output.failure('Traffic weight must be a valid number between 0 and 100.')
    throw new Error('Invalid traffic weight')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const serviceClient = new ServiceClient(new PlatformClient(config))
  const result = await serviceClient.setTraffic(
    manifest.platform.projectId,
    environment,
    {
      canaryDeploymentId: options.canary,
      weight,
      force: options.force ?? false,
    },
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (result.warning) {
    console.log(colors.yellow(`\n⚠ ${result.warning}`))
  }

  console.log(colors.green(`\n✔ Traffic allocation updated [${environment}]\n`))
  for (const alloc of result.allocations) {
    console.log(`  • Deployment: ${colors.bold(alloc.deploymentId)} — ${colors.cyan(alloc.weight + '%')} ${alloc.isCanary ? colors.yellow('(Canary)') : '(Primary)'}`)
  }
  console.log('')
}
