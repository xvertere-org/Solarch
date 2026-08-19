/**
 * Terminal formatters for Solarch log entries.
 */

import { LogEntry } from './types.js'
import { colors } from '../../ui/theme.js'

export function formatLogTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) {
      return timestamp.split('T')[1]?.split('.')[0] || timestamp
    }
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  } catch {
    return timestamp
  }
}

export function formatLogLevel(level: string): string {
  const upper = level.toUpperCase()
  switch (upper) {
    case 'ERROR':
      return colors.bold(colors.red('ERROR'))
    case 'WARN':
    case 'WARNING':
      return colors.bold(colors.yellow('WARN'))
    case 'DEBUG':
      return colors.dim('DEBUG')
    case 'INFO':
    default:
      return colors.cyan('INFO')
  }
}

export function formatLogEntry(entry: LogEntry): string {
  const time = formatLogTime(entry.timestamp)
  const level = formatLogLevel(entry.level)
  const lines: string[] = []

  lines.push(`${colors.dim(time)} ${level}`)
  lines.push(`${entry.message}`)

  if (entry.data) {
    if (typeof entry.data === 'string') {
      lines.push(`${colors.dim(entry.data)}`)
    } else {
      lines.push(`${colors.dim(JSON.stringify(entry.data))}`)
    }
  } else if (entry.duration !== undefined) {
    lines.push(`${colors.dim(`${entry.duration}ms`)}`)
  }

  return lines.join('\n')
}

export function formatLogsOutput(entries: LogEntry[]): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Logs'))}\n`)

  if (entries.length === 0) {
    console.log(colors.dim('No logs found.\n'))
    return
  }

  for (const entry of entries) {
    console.log(formatLogEntry(entry))
    console.log('')
  }
}
