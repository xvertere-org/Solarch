/**
 * Log entry filtering utilities.
 */

import { LogEntry } from './types.js'

export function filterLogsByLevel(logs: LogEntry[], targetLevel?: string): LogEntry[] {
  if (!targetLevel || targetLevel.toLowerCase() === 'all') {
    return logs
  }

  const normalized = targetLevel.toUpperCase()
  return logs.filter((log) => {
    const entryLevel = (log.level || 'INFO').toUpperCase()
    return entryLevel === normalized
  })
}
