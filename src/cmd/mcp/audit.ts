/**
 * Solarch CLI — MCP Audit Inspection Command (Phase 10)
 *
 * Implements `solarch mcp audit [--limit <n>] [--json]`
 */

import { McpAuditLogger } from '../../platform/mcp/audit.js'
import { colors } from '../../ui/theme.js'

export interface McpAuditOptions {
  limit?: number
  json?: boolean
  dir?: string
}

export async function runMcpAudit(options: McpAuditOptions = {}): Promise<void> {
  const projectDir = options.dir || process.cwd()
  const entries = await McpAuditLogger.readEntries(projectDir, options.limit || 20)

  if (options.json) {
    console.log(JSON.stringify(entries, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch MCP Tool Invocations Audit Trail\n'))

  if (entries.length === 0) {
    console.log(`  ${colors.dim('No MCP tool calls recorded in .solarch/audit/mcp-tool-calls.jsonl.')}\n`)
    return
  }

  for (const entry of entries) {
    const statusColor =
      entry.status === 'executed'
        ? colors.green('✔ EXECUTED')
        : entry.status === 'approval_required'
        ? colors.yellow('⚠ APPROVAL REQUIRED')
        : entry.status === 'rejected'
        ? colors.red('⛔ REJECTED')
        : colors.red('✖ FAILED')

    console.log(
      `  ${colors.bold(entry.timestamp)}  ${colors.cyan(entry.tool.padEnd(26, ' '))} ${statusColor}  ${colors.dim(
        `[${entry.environment}] (${entry.durationMs}ms)`
      )}`
    )
    if (entry.parameters && Object.keys(entry.parameters).length > 0) {
      console.log(`    ${colors.dim('Params:')} ${JSON.stringify(entry.parameters)}`)
    }
    if (entry.error) {
      console.log(`    ${colors.red('Error:')}  ${entry.error}`)
    }
    console.log('')
  }
}
