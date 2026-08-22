/**
 * Solarch CLI Traces Command (Phase 8)
 *
 * Implements `solarch traces [traceId] [--env <env>] [--json]`
 */

import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { TelemetryClient } from '../../platform/telemetry/client.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface TracesCommandOptions {
  traceId?: string
  env?: string
  json?: boolean
  dir?: string
  token?: string
}

export async function runTraces(options: TracesCommandOptions = {}): Promise<void> {
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
  const traces = await telemetryClient.getTraces(
    manifest.platform.projectId,
    environment,
    options.traceId,
    resolved.credentials.accessToken
  )

  if (options.json) {
    console.log(JSON.stringify(traces, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ Distributed Trace Spans [${environment}]\n`))

  if (!traces || traces.length === 0) {
    console.log(colors.dim('  No trace spans found for the selected query.\n'))
    return
  }

  for (const span of traces) {
    const statusColor = span.statusCode === 'error' ? colors.red('error') : colors.green('ok')
    console.log(`  • ${colors.bold(span.name)} [${statusColor}] (${span.durationMs}ms)`)
    console.log(`    Trace: ${colors.cyan(span.traceId)} | Span: ${span.spanId}${span.parentSpanId ? ` (Parent: ${span.parentSpanId})` : ''}`)
    console.log(`    W3C:   ${colors.dim(span.traceparent)}`)
    if (span.attributes && Object.keys(span.attributes).length > 0) {
      console.log(`    Attrs: ${JSON.stringify(span.attributes)}`)
    }
    console.log('')
  }
}
