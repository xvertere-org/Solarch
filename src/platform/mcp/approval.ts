/**
 * Solarch CLI — MCP Approval Manager (Phase 10)
 *
 * Handles creation and verification of approval challenges when external AI agents
 * request execution of production-mutating or destructive MCP tools.
 */

import { McpToolDefinition, McpApprovalRequest } from './types.js'
import { McpPermissionPolicy } from './permissions.js'

export class McpApprovalManager {
  /**
   * Constructs an approval payload returned to the external agent when approval is required.
   */
  public static createApprovalChallenge(
    tool: McpToolDefinition,
    params: Record<string, any> = {},
    environment: string = 'development'
  ): McpApprovalRequest {
    const impact = McpPermissionPolicy.getImpactDescription(tool, params)

    return {
      tool: tool.name,
      action: `Authorize execution of ${tool.name}`,
      risk: tool.risk,
      impact,
      parameters: params,
      environment,
      instructions: `This operation mutates production infrastructure or data. To execute, the caller must prompt the human developer for approval and re-send the request with "approved": true.`,
    }
  }
}
