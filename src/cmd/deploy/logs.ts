/**
 * Solarch CLI Deploy Logs Command (Phase 7)
 *
 * Implements `solarch deploy logs <deploymentId>` with secret redaction.
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DeploymentClient } from '../../platform/deployment/client.js'
import { LogRedactor } from '../../platform/deployment/log-redactor.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DeployLogsOptions {
  deploymentId: string
  dir?: string
  token?: string
}

export async function runDeployLogs(options: DeployLogsOptions): Promise<void> {
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
  const rawLogs = await deployClient.getDeploymentLogs(
    manifest.platform.projectId,
    options.deploymentId,
    resolved.credentials.accessToken
  )

  console.log(colors.bold(`\n⚡ Deployment Logs: ${options.deploymentId}\n`))

  if (!rawLogs || rawLogs.length === 0) {
    console.log(colors.dim('  No log entries recorded for this deployment.\n'))
    return
  }

  for (const entry of rawLogs) {
    const redacted = LogRedactor.redact(entry)
    console.log(`  ${redacted}`)
  }
  console.log('')
}
