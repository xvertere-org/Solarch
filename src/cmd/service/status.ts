/**
 * Solarch CLI Service Status Command (Phase 9)
 *
 * Implements `solarch service status [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { ServiceClient } from '../../platform/service/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface ServiceStatusCommandOptions {
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runServiceStatus(options: ServiceStatusCommandOptions = {}): Promise<void> {
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

  const serviceClient = new ServiceClient(new PlatformClient(config))
  const dashboard = await serviceClient.getDashboard(
    manifest.platform.projectId,
    environment,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(dashboard, null, 2))
    return
  }

  const stateColor =
    dashboard.state === 'HEALTHY'
      ? colors.green('HEALTHY')
      : dashboard.state === 'MAINTENANCE'
        ? colors.yellow('MAINTENANCE')
        : colors.red(dashboard.state)

  console.log(colors.bold('\nSOLARCH SERVICE STATUS\n'))
  console.log(`Project:     ${colors.cyan(manifest.name)} (${dashboard.projectId})`)
  console.log(`Environment: ${colors.bold(dashboard.environment)}\n`)

  console.log(colors.bold('Runtime:'))
  console.log(`  Status       ${stateColor}`)
  console.log(`  Instances    ${dashboard.topology.instances}`)
  console.log(`  CPU          ${dashboard.telemetry.cpuUsagePercent}%`)
  console.log(`  Memory       ${dashboard.telemetry.memoryUsageMb} MB / ${dashboard.topology.memoryMb} MB\n`)

  console.log(colors.bold('Deployment:'))
  console.log(`  Current      ${colors.cyan(dashboard.activeDeployment.id)} (v${dashboard.activeDeployment.version})`)
  console.log(`  Traffic      ${dashboard.activeDeployment.trafficPercent}%`)
  if (dashboard.canaryDeployment) {
    console.log(`  Canary       ${colors.yellow(dashboard.canaryDeployment.id)} (${dashboard.canaryDeployment.trafficPercent}%)`)
  }
  console.log('')

  console.log(colors.bold('Database:'))
  console.log(`  Provider     ${dashboard.database.provider}`)
  console.log(`  Topology     ${dashboard.database.topology}`)
  console.log(`  Status       ${dashboard.database.status === 'Healthy' ? colors.green('Healthy') : colors.red(dashboard.database.status)}\n`)

  console.log(colors.bold('Plugins:'))
  if (dashboard.plugins && dashboard.plugins.length > 0) {
    for (const p of dashboard.plugins) {
      console.log(`  ${p.name.padEnd(12)} ${p.status === 'Active' ? colors.green(p.status) : colors.yellow(p.status)}`)
    }
  } else {
    console.log(colors.dim('  None active'))
  }
  console.log('')

  console.log(colors.bold('Telemetry:'))
  console.log(`  Error rate   ${dashboard.telemetry.errorRate5xx > 0 ? colors.red(dashboard.telemetry.errorRate5xx + '%') : colors.green(dashboard.telemetry.errorRate5xx + '%')}`)
  console.log(`  p99          ${dashboard.telemetry.latencyP99Ms}ms`)
  console.log(`  RPS          ${dashboard.telemetry.rps}\n`)

  console.log(colors.bold('Recovery:'))
  console.log(`  Mode         ${dashboard.recovery.mode}`)
  console.log(`  Breaker      ${dashboard.recovery.circuitBreaker.tripped ? colors.red('TRIPPED') : colors.green('NORMAL')}`)
  if (dashboard.recovery.circuitBreaker.trippedReason) {
    console.log(`  Reason       ${colors.yellow(dashboard.recovery.circuitBreaker.trippedReason)}`)
  }
  console.log('')
}
