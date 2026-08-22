/**
 * Solarch CLI — MCP Tools List Command (Phase 10)
 *
 * Implements `solarch mcp tools [--json] [--category <cat>] [--risk <risk>]`
 */

import { McpRegistry } from '../../platform/mcp/registry.js'
import { ToolCategory, ToolRiskLevel } from '../../platform/mcp/types.js'
import { colors } from '../../ui/theme.js'

export interface McpToolsOptions {
  json?: boolean
  category?: string
  risk?: string
}

export async function runMcpTools(options: McpToolsOptions = {}): Promise<void> {
  let tools = McpRegistry.getAllTools()

  if (options.category) {
    tools = tools.filter((t) => t.category.toLowerCase() === options.category?.toLowerCase())
  }

  if (options.risk) {
    tools = tools.filter((t) => t.risk.toLowerCase() === options.risk?.toLowerCase())
  }

  if (options.json) {
    console.log(JSON.stringify(tools, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch MCP Tool Catalog (@solarch/mcp-server)\n'))

  const categories: ToolCategory[] = ['project', 'database', 'deployment', 'service', 'telemetry']

  for (const cat of categories) {
    const catTools = tools.filter((t) => t.category === cat)
    if (catTools.length === 0) continue

    console.log(`  ${colors.bold(colors.cyan(`[${cat.toUpperCase()} TOOLS]`))}`)

    for (const tool of catTools) {
      let riskBadge = colors.green('READ')
      if (tool.risk === 'local_mutation') riskBadge = colors.blue('LOCAL_MUTATION')
      if (tool.risk === 'production_mutation') riskBadge = colors.yellow('⚠ PRODUCTION_MUTATION')
      if (tool.risk === 'destructive') riskBadge = colors.red('⛔ DESTRUCTIVE')

      const approvalBadge = tool.approvalRequired ? colors.magenta('(Approval Required)') : ''

      console.log(`    ${colors.bold(tool.name.padEnd(28, ' '))} ${riskBadge} ${approvalBadge}`)
      console.log(`      ${colors.dim(tool.description)}`)
    }
    console.log('')
  }
}
