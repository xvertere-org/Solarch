/**
 * Solarch CLI Deploy Status Command (Phase 7)
 *
 * Implements `solarch deploy status [deploymentId] [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DeploymentClient } from '../../platform/deployment/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DeployStatusOptions {
  deploymentId?: string
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runDeployStatus(options: DeployStatusOptions = {}): Promise<void> {
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

  let targetDeploymentId = options.deploymentId

  if (!targetDeploymentId) {
    const list = await deployClient.listDeployments(
      manifest.platform.projectId,
      options.env,
      resolved.credentials.accessToken
    )
    if (!list || list.length === 0) {
      output.failure('No active deployments found.')
      throw new Error('No deployments found')
    }
    targetDeploymentId = list[0].deploymentId
  }

  const dep = await deployClient.getDeployment(
    manifest.platform.projectId,
    targetDeploymentId,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(dep, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Deployment Status: ${colors.cyan(dep.deploymentId)}\n`))
  console.log(`  • Project:     ${dep.projectId}`)
  console.log(`  • Environment: ${dep.environment}`)
  console.log(`  • Status:      ${colors.bold(dep.status)}`)
  console.log(`  • Bundle Hash: ${dep.bundleHash}`)
  console.log(`  • Created:     ${dep.createdAt}`)
  if (dep.deploymentUrl) {
    console.log(`  • URL:         ${colors.cyan(dep.deploymentUrl)}`)
  }
  if (dep.error) {
    console.log(`  • Error:       ${colors.red(dep.error)}`)
  }
  console.log('')
}
