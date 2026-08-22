/**
 * Solarch CLI Service Maintenance Command (Phase 9)
 *
 * Implements `solarch service maintenance <on|off> [--message <msg>] [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { ServiceClient } from '../../platform/service/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ServiceMaintenanceCommandOptions {
  action?: 'on' | 'off'
  message?: string
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runServiceMaintenance(options: ServiceMaintenanceCommandOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  if (options.action !== 'on' && options.action !== 'off') {
    output.failure('Specify maintenance action: "on" or "off".')
    throw new Error('Invalid maintenance action')
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const enabled = options.action === 'on'
  const serviceClient = new ServiceClient(new PlatformClient(config))
  const result = await serviceClient.setMaintenance(
    manifest.platform.projectId,
    environment,
    {
      enabled,
      message: options.message,
    },
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (result.enabled) {
    console.log(colors.yellow(`\n⚠ Maintenance mode enabled [${environment}]`))
    console.log(`  Message: ${result.message}\n`)
  } else {
    console.log(colors.green(`\n✔ Maintenance mode disabled [${environment}]. Normal traffic restored.\n`))
  }
}
