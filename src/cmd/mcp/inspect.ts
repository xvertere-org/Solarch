/**
 * Solarch CLI — MCP Inspect Tool Command (Phase 10)
 *
 * Implements `solarch mcp inspect <toolName> [--json]`
 */

import { McpRegistry } from '../../platform/mcp/registry.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface McpInspectOptions {
  toolName: string
  json?: boolean
}

export async function runMcpInspect(options: McpInspectOptions): Promise<void> {
  const tool = McpRegistry.getTool(options.toolName)

  if (!tool) {
    output.failure(`Tool "${options.toolName}" not found in Solarch MCP catalog.`)
    console.log(`\nRun ${colors.bold('solarch mcp tools')} to view all registered tools.\n`)
    throw new Error(`Tool not found: ${options.toolName}`)
  }

  if (options.json) {
    console.log(JSON.stringify(tool, null, 2))
    return
  }

  console.log(colors.bold(`\n⚡ MCP Tool Inspection: ${colors.cyan(tool.name)}\n`))
  console.log(`  ${colors.dim('Category:')}           ${tool.category}`)
  console.log(`  ${colors.dim('Risk Level:')}         ${tool.risk.toUpperCase()}`)
  console.log(`  ${colors.dim('Approval Required:')}  ${tool.approvalRequired ? 'Yes (Human sign-off required)' : 'No (Autonomous execution allowed)'}`)
  console.log(`  ${colors.dim('Description:')}        ${tool.description}`)

  console.log(colors.bold('\n  Parameters:'))
  const params = Object.entries(tool.parameters)
  if (params.length === 0) {
    console.log(`    ${colors.dim('(No parameters required)')}`)
  } else {
    for (const [key, prop] of params) {
      const req = prop.required ? colors.red('*required') : colors.dim('optional')
      console.log(`    • ${colors.bold(key)} (${prop.type}) [${req}]`)
      console.log(`      ${colors.dim(prop.description)}`)
    }
  }
  console.log('')
}
