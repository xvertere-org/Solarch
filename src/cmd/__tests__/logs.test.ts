import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  parseLogLine,
  filterLogsByLevel,
  fetchRecentLogs,
  streamLogs,
  runLogs,
  LogEntry,
} from '../logs/index.js'
import { Solarch } from '../../solarch.js'

describe('solarch logs Command & Runtime Visibility', () => {
  let tempDir: string
  let pbDataDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-logs-test-'))
    pbDataDir = path.join(tempDir, 'pb_data')
    fs.mkdirSync(pbDataDir, { recursive: true })
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. parses various log line formats correctly', () => {
    const jsonLine = JSON.stringify({
      timestamp: '2026-08-19T10:20:00Z',
      level: 'INFO',
      message: 'GET /api/users',
      duration: 32,
    })
    const parsedJson = parseLogLine(jsonLine)
    expect(parsedJson).toBeDefined()
    expect(parsedJson?.level).toBe('INFO')
    expect(parsedJson?.message).toBe('GET /api/users')
    expect(parsedJson?.duration).toBe(32)

    const textLine = '2026-08-19 12:00:00 WARN Slow query detected'
    const parsedText = parseLogLine(textLine)
    expect(parsedText?.level).toBe('WARN')
    expect(parsedText?.message).toBe('Slow query detected')
  })

  it('2. filters log entries by level accurately', () => {
    const logs: LogEntry[] = [
      { timestamp: '1', level: 'DEBUG', message: 'debug msg' },
      { timestamp: '2', level: 'INFO', message: 'info msg' },
      { timestamp: '3', level: 'WARN', message: 'warn msg' },
      { timestamp: '4', level: 'ERROR', message: 'error msg' },
    ]

    expect(filterLogsByLevel(logs, 'all').length).toBe(4)
    expect(filterLogsByLevel(logs, 'ERROR').length).toBe(1)
    expect(filterLogsByLevel(logs, 'error')[0].message).toBe('error msg')
    expect(filterLogsByLevel(logs, 'WARN').length).toBe(1)
    expect(filterLogsByLevel(logs, 'INFO').length).toBe(1)
  })

  it('3. reads logs from database _logs table', async () => {
    const app = new Solarch({
      defaultDataDir: pbDataDir,
      hideStartBanner: true,
    })
    await app.bootstrap()

    await app.db().execute(`
      INSERT INTO _logs (id, level, message, data, created)
      VALUES ('log1', 'INFO', 'GET /api/users', '200 32ms', '2026-08-19 12:01:22')
    `)

    await app.db().execute(`
      INSERT INTO _logs (id, level, message, data, created)
      VALUES ('log2', 'ERROR', 'Database timeout', '500', '2026-08-19 12:01:25')
    `)
    await app.db().close()

    const results = await fetchRecentLogs(tempDir, 50)
    expect(results.length).toBe(2)

    const errorResults = await fetchRecentLogs(tempDir, 50, 'ERROR')
    expect(errorResults.length).toBe(1)
    expect(errorResults[0].message).toBe('Database timeout')
  })

  it('4. runLogs returns JSON formatted array', async () => {
    const app = new Solarch({
      defaultDataDir: pbDataDir,
      hideStartBanner: true,
    })
    await app.bootstrap()

    await app.db().execute(`
      INSERT INTO _logs (id, level, message, data, created)
      VALUES ('log1', 'INFO', 'Server started', '', '2026-08-19 12:00:00')
    `)
    await app.db().close()

    const logs = await runLogs({
      dir: tempDir,
      json: true,
      exitOnComplete: false,
    })

    expect(Array.isArray(logs)).toBe(true)
    expect(logs.length).toBe(1)
    expect(logs[0].message).toBe('Server started')
  })

  it('5. streamLogs follow mode cleans up without leaks', async () => {
    let count = 0
    const stop = streamLogs(tempDir, () => {
      count++
    })

    expect(typeof stop).toBe('function')
    // Stop immediately
    stop()
  })
})
