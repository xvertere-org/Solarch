/**
 * Solarch CLI — MCP Local Server Bridge Command (Phase 10)
 *
 * Implements `solarch mcp serve [--dir <path>]`
 * Bridges incoming JSON-RPC / stdio tool execution requests to the McpServerBridge.
 */

import * as readline from 'readline'
import { McpServerBridge } from '../../platform/mcp/server.js'
import { McpToolCallRequest } from '../../platform/mcp/types.js'

export interface McpServeOptions {
  dir?: string
}

export async function runMcpServe(options: McpServeOptions = {}): Promise<void> {
  const bridge = new McpServerBridge()
  const projectDir = options.dir || process.cwd()

  // Standard line-delimited JSON-RPC / tool-call loop for stdio transport
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on('line', async (line: string) => {
    if (!line.trim()) return

    try {
      const request = JSON.parse(line) as McpToolCallRequest
      request.projectDir = request.projectDir || projectDir

      const response = await bridge.handleToolCall(request)
      process.stdout.write(JSON.stringify(response) + '\n')
    } catch (err: any) {
      process.stdout.write(
        JSON.stringify({
          status: 'error',
          tool: 'unknown',
          error: `Malformed tool call request: ${err.message}`,
        }) + '\n'
      )
    }
  })
}
