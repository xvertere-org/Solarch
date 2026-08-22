/**
 * Solarch CLI Deploy Rollback Command (Phase 7)
 *
 * Implements `solarch deploy rollback [--env <env>] --target <deploymentId>`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DeploymentClient } from '../../platform/deployment/client.js'
import { DeploymentRollbackManager } from '../../platform/deployment/rollback.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DeployRollbackOptions {
  target: string
  env?: string
  dir?: string
  token?: string
}

export async function runDeployRollback(options: DeployRollbackOptions): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  if (!options.target) {
    output.failure('Please specify target deployment ID to rollback to (--target <deploymentId>).')
    throw new Error('Target deployment required')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const s = createSpinner()
  s.start(`Validating and rolling back traffic to deployment "${options.target}" [${environment}]...`)

  try {
    const deployClient = new DeploymentClient(new PlatformClient(config))
    const rolledBackRecord = await DeploymentRollbackManager.executeRollback(
      deployClient,
      manifest.platform.projectId,
      environment,
      options.target,
      resolved.credentials.accessToken
    )

    s.stop('Rollback traffic promotion complete.')

    output.success(
      `Successfully rolled back traffic to deployment ${colors.bold(rolledBackRecord.deploymentId)}.`
    )
    if (rolledBackRecord.deploymentUrl) {
      console.log(`  • Live URL: ${colors.cyan(rolledBackRecord.deploymentUrl)}\n`)
    }
  } catch (err: any) {
    s.stop('Rollback failed.')
    output.failure(`Rollback error: ${err?.message || err}`)
    throw err
  }
}
