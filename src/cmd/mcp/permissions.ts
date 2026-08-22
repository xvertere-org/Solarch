/**
 * Solarch CLI — MCP Permissions Command (Phase 10)
 *
 * Implements `solarch mcp permissions [--json]`
 */

import { McpRegistry } from '../../platform/mcp/registry.js'
import { colors } from '../../ui/theme.js'

export interface McpPermissionsOptions {
  json?: boolean
}

export async function runMcpPermissions(options: McpPermissionsOptions = {}): Promise<void> {
  const allTools = McpRegistry.getAllTools()
  const readTools = allTools.filter((t) => t.risk === 'read')
  const localMutationTools = allTools.filter((t) => t.risk === 'local_mutation')
  const prodMutationTools = allTools.filter((t) => t.risk === 'production_mutation')
  const destructiveTools = allTools.filter((t) => t.risk === 'destructive')

  const permissionMatrix = {
    policyVersion: '1.0.0',
    serverPackage: '@solarch/mcp-server',
    riskTiers: {
      read: {
        total: readTools.length,
        approvalRequired: false,
        environments: ['development', 'staging', 'production'],
        tools: readTools.map((t) => t.name),
      },
      local_mutation: {
        total: localMutationTools.length,
        approvalRequired: false,
        environments: ['development'],
        tools: localMutationTools.map((t) => t.name),
      },
      production_mutation: {
        total: prodMutationTools.length,
        approvalRequired: true,
        environments: ['staging', 'production'],
        tools: prodMutationTools.map((t) => t.name),
      },
      destructive: {
        total: destructiveTools.length,
        approvalRequired: true,
        environments: ['all'],
        tools: destructiveTools.map((t) => t.name),
      },
    },
  }

  if (options.json) {
    console.log(JSON.stringify(permissionMatrix, null, 2))
    return
  }

  console.log(colors.bold('\n⚡ Solarch MCP Tool Permission & Risk Governance Matrix\n'))

  console.log(`  ${colors.bold(colors.green('TIER 1: READ-ONLY (Autonomous Execution Allowed)'))}`)
  console.log(`    Total: ${readTools.length} tools`)
  console.log(`    Environments: development, staging, production`)
  console.log(`    Tools: ${colors.dim(readTools.map((t) => t.name).join(', '))}`)
  console.log('')

  console.log(`  ${colors.bold(colors.blue('TIER 2: LOCAL MUTATION (Safe Local Scaffolding)'))}`)
  console.log(`    Total: ${localMutationTools.length} tools`)
  console.log(`    Environments: development only`)
  console.log(`    Tools: ${colors.dim(localMutationTools.map((t) => t.name).join(', ') || 'None')}`)
  console.log('')

  console.log(`  ${colors.bold(colors.yellow('TIER 3: PRODUCTION MUTATION (Explicit Approval Required)'))}`)
  console.log(`    Total: ${prodMutationTools.length} tools`)
  console.log(`    Environments: staging, production`)
  console.log(`    Tools: ${colors.dim(prodMutationTools.map((t) => t.name).join(', '))}`)
  console.log('')

  console.log(`  ${colors.bold(colors.red('TIER 4: DESTRUCTIVE (Unconditional Human Approval)'))}`)
  console.log(`    Total: ${destructiveTools.length} tools`)
  console.log(`    Environments: all`)
  console.log(`    Tools: ${colors.dim(destructiveTools.map((t) => t.name).join(', '))}`)
  console.log('')
}
