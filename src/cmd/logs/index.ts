/**
 * Solarch CLI: solarch logs
 * Developer runtime visibility with level filtering, tail bounds, JSON export, and live streaming.
 */

import path from 'path'
import { LogsOptions, LogEntry } from './types.js'
import { fetchRecentLogs, streamLogs } from './reader.js'
import { formatLogsOutput, formatLogEntry } from './formatter.js'
import { colors } from '../../ui/theme.js'

export * from './types.js'
export * from './filter.js'
export * from './formatter.js'
export * from './reader.js'

export async function runLogs(opts: LogsOptions = {}): Promise<LogEntry[]> {
  const cwd = path.resolve(opts.dir || '.')
  const tailCount = typeof opts.tail === 'string' ? parseInt(opts.tail, 10) : (opts.tail ?? 50)

  // Remote platform logs if --env is specified
  if (opts.env) {
    const { ProjectMetadata } = await import('../../ecosystem/metadata.js')
    const manifest = await ProjectMetadata.readManifest(cwd)
    if (!manifest || !manifest.platform) {
      throw new Error('Project is not linked to Solarch Platform. Run "solarch link" first.')
    }

    const { PlatformConfig } = await import('../../platform/config.js')
    const { PlatformClient } = await import('../../platform/client/platform-client.js')
    const { TelemetryClient } = await import('../../platform/telemetry/client.js')
    const { AuthService } = await import('../../platform/auth/auth-service.js')

    const config = PlatformConfig.default()
    const authService = new AuthService(config)
    const resolved = await authService.resolveSession(opts.token)

    if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
      throw new Error('Authentication required for remote logs. Run "solarch login" first.')
    }

    const telemetryClient = new TelemetryClient(new PlatformClient(config))
    const remoteLogs = await telemetryClient.getLogs(
      manifest.platform.projectId,
      opts.env,
      { limit: tailCount, level: opts.level },
      resolved.credentials.accessToken
    )

    const normalizedLogs: LogEntry[] = remoteLogs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      level: l.level.toUpperCase(),
      message: l.message,
      data: l.attributes,
    }))

    if (opts.json) {
      console.log(JSON.stringify(normalizedLogs, null, 2))
    } else {
      formatLogsOutput(normalizedLogs)
    }

    if (opts.exitOnComplete ?? true) {
      process.exit(0)
    }
    return normalizedLogs
  }

  // Local offline logs
  if (opts.follow) {
    console.log(`\n${colors.bold(colors.cyan('⚡ Streaming Solarch Logs (Press Ctrl+C to exit)'))}\n`)

    const stop = streamLogs(
      cwd,
      (entry) => {
        if (opts.json) {
          console.log(JSON.stringify(entry))
        } else {
          console.log(formatLogEntry(entry))
          console.log('')
        }
      },
      opts.level
    )

    const cleanup = () => {
      stop()
      if (opts.exitOnComplete ?? true) {
        process.exit(0)
      }
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    return []
  }

  const logs = await fetchRecentLogs(cwd, tailCount, opts.level)

  if (opts.json) {
    console.log(JSON.stringify(logs, null, 2))
  } else {
    formatLogsOutput(logs)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return logs
}
