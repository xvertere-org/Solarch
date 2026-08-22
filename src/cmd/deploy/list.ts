/**
 * Solarch CLI Deploy List Command (Phase 7)
 *
 * Implements `solarch deploy list [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DeploymentClient } from '../../platform/deployment/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DeployListOptions {
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runDeployList(options: DeployListOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const deployClient = new DeploymentClient(new PlatformClient(config))
  const deployments = await deployClient.listDeployments(
    manifest.platform.projectId,
    options.env,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(deployments, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Deployment History [${manifest.name}]\n`))

  if (!deployments || deployments.length === 0) {
    console.log(colors.dim('  No deployments found for this project.\n'))
    return
  }

  for (const dep of deployments) {
    const statusColor =
      dep.status === 'active' || dep.status === 'healthy'
        ? colors.green(dep.status)
        : dep.status === 'failed' || dep.status === 'unhealthy'
          ? colors.red(dep.status)
          : colors.yellow(dep.status)

    console.log(`  ${colors.bold(dep.deploymentId.padEnd(24, ' '))} ${statusColor} [${dep.environment}]`)
    console.log(`    Created: ${dep.createdAt} | Hash: ${dep.bundleHash.substring(0, 18)}...`)
    if (dep.deploymentUrl) {
      console.log(`    URL: ${colors.cyan(dep.deploymentUrl)}`)
    }
    console.log('')
  }
}
