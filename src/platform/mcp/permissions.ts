/**
 * Solarch CLI — MCP Tool Permission Policy (Phase 10)
 *
 * Enforces risk boundaries and approval requirements for external AI agent tool invocations.
 */

import { McpToolDefinition, ToolRiskLevel } from './types.js'

export interface PermissionCheckResult {
  allowed: boolean
  requiresApproval: boolean
  reason?: string
}

export class McpPermissionPolicy {
  /**
   * Evaluates if a tool invocation can proceed directly or requires human approval.
   */
  public static evaluate(
    tool: McpToolDefinition,
    environment: string = 'development',
    approved: boolean = false
  ): PermissionCheckResult {
    // 1. Read-only operations are always permitted without approval
    if (tool.risk === 'read') {
      return { allowed: true, requiresApproval: false }
    }

    // 2. Already explicitly approved by caller/human
    if (approved) {
      return { allowed: true, requiresApproval: false }
    }

    // 3. Local mutations in development might be allowed or soft-approved
    if (tool.risk === 'local_mutation' && environment === 'development') {
      return { allowed: true, requiresApproval: false }
    }

    // 4. Production mutations & destructive operations unconditionally require approval
    if (tool.risk === 'production_mutation' || tool.risk === 'destructive' || environment === 'production' || environment === 'staging') {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Tool "${tool.name}" has risk level "${tool.risk}" targeting environment "${environment}" and requires explicit approval.`,
      }
    }

    return {
      allowed: !tool.approvalRequired,
      requiresApproval: tool.approvalRequired,
      reason: tool.approvalRequired ? `Tool "${tool.name}" requires explicit user authorization.` : undefined,
    }
  }

  /**
   * Returns standard impact description for high-risk operations.
   */
  public static getImpactDescription(tool: McpToolDefinition, params: Record<string, any> = {}): string {
    switch (tool.name) {
      case 'database.migration.apply':
        return `Apply schema migrations to ${params.environment || 'target database'}. This may alter or drop tables.`
      case 'deployment.deploy':
        return `Deploy project release ${params.tag || 'latest'} to cloud environment ${params.environment || 'production'}.`
      case 'deployment.rollback':
        return `Rollback active deployment in ${params.environment || 'production'} to release ${params.targetDeploymentId || 'previous'}.`
      case 'service.scale':
        return `Scale service replicas in ${params.environment || 'production'} (min: ${params.minReplicas ?? 'current'}, max: ${params.maxReplicas ?? 'current'}).`
      case 'service.traffic':
        return `Shift traffic: route ${params.canaryPercent}% of live traffic to canary deployment in ${params.environment || 'production'}.`
      case 'service.maintenance':
        return `${params.enabled ? 'Enable' : 'Disable'} maintenance mode for service in ${params.environment || 'production'}.`
      default:
        return `Execute mutating action "${tool.name}" with parameters: ${JSON.stringify(params)}.`
    }
  }
}
