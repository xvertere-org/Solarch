/**
 * Solarch CLI Metrics Command (Phase 8)
 *
 * Implements `solarch metrics [--env <env>] [--window <ms>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { TelemetryClient } from '../../platform/telemetry/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface MetricsCommandOptions {
  env?: string
  window?: string | number
  json?: boolean
  dir?: string
  token?: string
}

export async function runMetrics(options: MetricsCommandOptions = {}): Promise<void> {
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

  const windowMs = Number(options.window) || 60000
  const telemetryClient = new TelemetryClient(new PlatformClient(config))
  const snapshot = await telemetryClient.getMetrics(
    manifest.platform.projectId,
    environment,
    windowMs,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Telemetry Metrics Snapshot [${environment}]`))
  console.log(colors.dim(`  Project: ${manifest.name} (${manifest.platform.projectId}) | Window: ${windowMs / 1000}s\n`))

  console.log(`  • Request Throughput:   ${colors.cyan(snapshot.rps + ' req/sec')} (Total: ${snapshot.totalRequests})`)
  console.log(`  • Latency Distribution: p50: ${colors.bold(snapshot.latencyP50Ms + 'ms')} | p95: ${colors.yellow(snapshot.latencyP95Ms + 'ms')} | p99: ${colors.yellow(snapshot.latencyP99Ms + 'ms')}`)
  console.log(`  • Error Rates:          4xx: ${snapshot.errorRate4xx > 5 ? colors.red(snapshot.errorRate4xx + '%') : colors.green(snapshot.errorRate4xx + '%')} | 5xx: ${snapshot.errorRate5xx > 0 ? colors.red(snapshot.errorRate5xx + '%') : colors.green(snapshot.errorRate5xx + '%')}`)
  console.log(`  • Database Health:      Avg Latency: ${snapshot.dbAverageLatencyMs}ms | Active Connections: ${snapshot.dbActiveConnections}`)
  console.log(`  • System Resources:     Memory: ${snapshot.memoryUsageMb} MB | CPU: ${snapshot.cpuUsagePercent}%\n`)
}
