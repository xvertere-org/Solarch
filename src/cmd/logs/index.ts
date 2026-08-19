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
