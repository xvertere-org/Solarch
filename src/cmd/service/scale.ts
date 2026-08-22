/**
 * Solarch CLI Service Scale Command (Phase 9)
 *
 * Implements `solarch service scale --instances <n> [--memory <mb>] [--cpu <milli>] [--force] [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { ServiceClient } from '../../platform/service/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ServiceScaleCommandOptions {
  instances?: number | string
  memory?: number | string
  cpu?: number | string
  force?: boolean
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runServiceScale(options: ServiceScaleCommandOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  if (options.instances === undefined && options.memory === undefined && options.cpu === undefined) {
    output.failure('Specify at least one resource flag (--instances, --memory, or --cpu).')
    throw new Error('Missing scale arguments')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const serviceClient = new ServiceClient(new PlatformClient(config))
  const spec = {
    instances: options.instances !== undefined ? Number(options.instances) : undefined,
    memoryMb: options.memory !== undefined ? Number(options.memory) : undefined,
    cpuMilli: options.cpu !== undefined ? Number(options.cpu) : undefined,
  }

  const result = await serviceClient.scaleService(
    manifest.platform.projectId,
    environment,
    spec,
    options.force ?? false,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (result.warning) {
    console.log(colors.yellow(`\n⚠ ${result.warning}`))
  }

  console.log(colors.green(`\n✔ Service successfully scaled [${environment}]`))
  console.log(`  Instances: ${colors.bold(result.topology.instances.toString())}`)
  console.log(`  Memory:    ${result.topology.memoryMb} MB`)
  console.log(`  CPU:       ${result.topology.cpuMilli}m\n`)
}
