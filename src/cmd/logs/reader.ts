/**
 * Log reader for extracting runtime logs from the Solarch database or filesystem.
 */

import fs from 'fs'
import path from 'path'
import { LogEntry } from './types.js'
import { filterLogsByLevel } from './filter.js'
import { Solarch } from '../../solarch.js'
import { resolveEffectiveConfig } from '../config/resolver.js'

/**
 * Parses raw JSON log lines or standard formatted lines from log files
 */
export function parseLogLine(line: string): LogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const json = JSON.parse(trimmed)
    if (json.timestamp || json.created || json.message) {
      return {
        id: json.id,
        timestamp: json.timestamp || json.created || new Date().toISOString(),
        level: json.level || 'INFO',
        message: json.message || '',
        data: json.data,
        duration: json.duration,
      }
    }
  } catch {}

  // Fallback: regex for "YYYY-MM-DD HH:MM:SS [LEVEL] message" or "HH:MM:SS LEVEL message"
  const match = trimmed.match(/^(\d{2,4}[-:/]\S+(?:\s+\d{2}:\d{2}(?::\d{2})?)?|\d{2}:\d{2}(?::\d{2})?)\s+(INFO|WARN|ERROR|DEBUG)\s+(.*)$/i)
  if (match) {
    return {
      timestamp: match[1],
      level: match[2].toUpperCase(),
      message: match[3],
    }
  }

  return {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: trimmed,
  }
}

/**
 * Fetches recent logs from database and/or logs/ directory
 */
export async function fetchRecentLogs(cwd: string, tailCount = 50, level?: string): Promise<LogEntry[]> {
  const entries: LogEntry[] = []

  // 1. Try reading from database _logs table
  try {
    const { report: cfgReport } = resolveEffectiveConfig({ dir: cwd })
    const dataDir = cfgReport.runtime.dataDir || './pb_data'
    const fullDataDir = path.isAbsolute(dataDir) ? dataDir : path.join(cwd, dataDir)

    if (fs.existsSync(fullDataDir)) {
      const app = new Solarch({
        defaultDataDir: fullDataDir,
        hideStartBanner: true,
      })

      await app.bootstrap()
      if (await app.db().hasTable('_logs')) {
        let sql = `SELECT * FROM _logs ORDER BY created DESC LIMIT ?`
        let params: any[] = [tailCount]

        if (level && level.toLowerCase() !== 'all') {
          sql = `SELECT * FROM _logs WHERE UPPER(level) = ? ORDER BY created DESC LIMIT ?`
          params = [level.toUpperCase(), tailCount]
        }

        const rows = await app.db().query<{
          id: string
          level: string
          message: string
          data: string
          created: string
        }>(sql, params)

        for (const row of rows) {
          entries.push({
            id: row.id,
            timestamp: row.created,
            level: row.level,
            message: row.message,
            data: row.data ? (() => { try { return JSON.parse(row.data) } catch { return row.data } })() : undefined,
          })
        }
      }
      try { await app.db().close() } catch {}
    }
  } catch {}

  // 2. Try reading from logs/ directory files if present
  const logsDir = path.join(cwd, 'logs')
  if (fs.existsSync(logsDir)) {
    try {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'))
      for (const file of files) {
        const filePath = path.join(logsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').filter(l => l.trim().length > 0)
        for (const line of lines) {
          const parsed = parseLogLine(line)
          if (parsed) entries.push(parsed)
        }
      }
    } catch {}
  }

  // Filter and sort ascending for readable presentation
  const filtered = filterLogsByLevel(entries, level)
  return filtered.slice(-tailCount)
}

/**
 * Continuously polls and streams new log entries
 */
export function streamLogs(
  cwd: string,
  onNewEntry: (entry: LogEntry) => void,
  level?: string
): () => void {
  let isStopped = false
  const seenIds = new Set<string>()

  // Initial load to register existing entries
  fetchRecentLogs(cwd, 100, level).then((initial) => {
    if (isStopped) return
    for (const e of initial) {
      if (e.id) seenIds.add(e.id)
      onNewEntry(e)
    }
  })

  const interval = setInterval(async () => {
    if (isStopped) return
    try {
      const recent = await fetchRecentLogs(cwd, 20, level)
      for (const entry of recent) {
        const idKey = entry.id || `${entry.timestamp}-${entry.message}`
        if (!seenIds.has(idKey)) {
          seenIds.add(idKey)
          onNewEntry(entry)
        }
      }
    } catch {}
  }, 400)

  return () => {
    isStopped = true
    clearInterval(interval)
  }
}
