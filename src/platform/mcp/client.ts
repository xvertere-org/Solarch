/**
 * Solarch MCP Client Interface
 *
 * Provides typed communication hooks for external agent clients (Claude Code, Cursor, IDEs)
 * communicating via @solarch/mcp-server.
 */

import { McpServerBridge } from './server.js'
import { McpRegistry } from './registry.js'
import { McpToolCallRequest, McpToolCallResponse, McpToolDefinition } from './types.js'

export class McpClient {
  private bridge: McpServerBridge

  constructor(bridge?: McpServerBridge) {
    this.bridge = bridge || new McpServerBridge()
  }

  /**
   * Retrieves available tool definitions.
   */
  public async getAvailableTools(): Promise<McpToolDefinition[]> {
    return McpRegistry.getAllTools()
  }

  /**
   * Invokes a tool through the MCP bridge.
   */
  public async invokeTool(request: McpToolCallRequest): Promise<McpToolCallResponse> {
    return this.bridge.handleToolCall(request)
  }
}
