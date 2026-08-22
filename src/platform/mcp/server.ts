/**
 * Solarch CLI — MCP Tool Execution Server & Dispatcher (Phase 10)
 *
 * Receives tool calls from external AI agents (@solarch/mcp-server, Claude, Cursor),
 * evaluates permissions, enforces approval boundaries, dispatches through McpAdapter,
 * and maintains an append-only audit trail.
 */

import { McpRegistry } from './registry.js'
import { McpPermissionPolicy } from './permissions.js'
import { McpApprovalManager } from './approval.js'
import { McpAuditLogger } from './audit.js'
import { McpAdapter } from './adapter.js'
import { McpToolCallRequest, McpToolCallResponse } from './types.js'

export class McpServerBridge {
  private adapter: McpAdapter

  constructor(adapter: McpAdapter = new McpAdapter()) {
    this.adapter = adapter
  }

  /**
   * Processes an incoming MCP tool invocation request.
   */
  public async handleToolCall(request: McpToolCallRequest): Promise<McpToolCallResponse> {
    const startTime = Date.now()
    const projectDir = request.projectDir || process.cwd()
    const environment = request.environment || 'development'
    const callerId = request.callerId || 'external-agent'
    const toolName = request.tool
    const params = request.parameters || {}

    // 1. Tool existence check
    const tool = McpRegistry.getTool(toolName)
    if (!tool) {
      return {
        status: 'error',
        tool: toolName,
        error: `Tool "${toolName}" is not registered in Solarch MCP catalog.`,
      }
    }

    // 2. Permission & Approval evaluation
    const perm = McpPermissionPolicy.evaluate(tool, environment, request.approved ?? false)

    if (perm.requiresApproval) {
      const challenge = McpApprovalManager.createApprovalChallenge(tool, params, environment)

      await McpAuditLogger.log(projectDir, {
        tool: toolName,
        risk: tool.risk,
        environment,
        caller: callerId,
        status: 'approval_required',
        durationMs: Date.now() - startTime,
        parameters: params,
      })

      return {
        status: 'approval_required',
        tool: toolName,
        approval: challenge,
      }
    }

    // 3. Execution
    try {
      const data = await this.adapter.executeTool(toolName, params, {
        projectDir,
        environment,
        callerId,
        approved: request.approved,
        approvalToken: request.approvalToken,
      })

      await McpAuditLogger.log(projectDir, {
        tool: toolName,
        risk: tool.risk,
        environment,
        caller: callerId,
        status: 'executed',
        durationMs: Date.now() - startTime,
        parameters: params,
      })

      return {
        status: 'success',
        tool: toolName,
        data,
      }
    } catch (err: any) {
      await McpAuditLogger.log(projectDir, {
        tool: toolName,
        risk: tool.risk,
        environment,
        caller: callerId,
        status: 'failed',
        durationMs: Date.now() - startTime,
        parameters: params,
        error: err.message,
      })

      return {
        status: 'error',
        tool: toolName,
        error: err.message,
      }
    }
  }
}
