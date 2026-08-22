/**
 * Solarch CLI Alerts Command (Phase 8)
 *
 * Implements `solarch alerts [--env <env>] [--json]` (read-only observational status).
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { TelemetryClient } from '../../platform/telemetry/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface AlertsCommandOptions {
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runAlerts(options: AlertsCommandOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
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

  const telemetryClient = new TelemetryClient(new PlatformClient(config))
  const alerts = await telemetryClient.getAlerts(
    manifest.platform.projectId,
    environment,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(alerts, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Production Alerts & Health Status [${environment}]\n`))

  if (!alerts || alerts.length === 0) {
    console.log(colors.green('  ✔ All health alert monitors passing. No active incidents.\n'))
    return
  }

  for (const alert of alerts) {
    const statusColor =
      alert.status === 'firing'
        ? alert.severity === 'critical'
          ? colors.bold(colors.red('FIRING'))
          : colors.yellow('FIRING')
        : colors.green('RESOLVED')

    console.log(`  • ${colors.bold(alert.name)} [${statusColor}] (${alert.severity})`)
    console.log(`    Metric: ${alert.metric} ${alert.comparison} ${alert.threshold}`)
    console.log(`    Detail: ${alert.message}`)
    if (alert.triggeredAt) {
      console.log(`    Triggered: ${alert.triggeredAt}`)
    }
    console.log('')
  }
}
