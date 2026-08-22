/**
 * Solarch CLI — MCP Tool Call Audit Logger (Phase 10)
 *
 * Persists an append-only JSONL log of external agent tool invocations
 * at `.solarch/audit/mcp-tool-calls.jsonl` with pre-persistence redaction.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { McpAuditEntry } from './types.js'
import { TelemetrySanitiser } from '../telemetry/sanitiser.js'

export class McpAuditLogger {
  private static getAuditLogPath(projectDir: string = process.cwd()): string {
    return path.join(projectDir, '.solarch', 'audit', 'mcp-tool-calls.jsonl')
  }

  /**
   * Appends an audit entry for a tool call.
   */
  public static async log(
    projectDir: string,
    entry: Omit<McpAuditEntry, 'id' | 'timestamp'>
  ): Promise<McpAuditEntry> {
    const fullEntry: McpAuditEntry = {
      id: `mcp_call_${crypto.randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry,
      parameters: TelemetrySanitiser.sanitize(entry.parameters || {}),
    }

    try {
      const logPath = this.getAuditLogPath(projectDir)
      const dir = path.dirname(logPath)
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.appendFile(logPath, JSON.stringify(fullEntry) + '\n', 'utf-8')
    } catch {
      // Fail-open: audit logging failure should not crash CLI execution
    }

    return fullEntry
  }

  /**
   * Reads recent audit log entries.
   */
  public static async readEntries(
    projectDir: string = process.cwd(),
    limit: number = 50
  ): Promise<McpAuditEntry[]> {
    const logPath = this.getAuditLogPath(projectDir)
    if (!fs.existsSync(logPath)) {
      return []
    }

    try {
      const content = await fs.promises.readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n').filter((l) => l.trim().length > 0)
      const entries: McpAuditEntry[] = []

      for (const line of lines) {
        try {
          entries.push(JSON.parse(line))
        } catch {}
      }

      return entries.reverse().slice(0, limit)
    } catch {
      return []
    }
  }
}
