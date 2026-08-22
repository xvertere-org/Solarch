/**
 * Solarch CLI — MCP Integration & Agent Tooling Contracts (Phase 10)
 *
 * Defines tool risk tiers, capability schemas, approval boundaries,
 * and execution audit contracts for external AI agents (Claude Code, Cursor, IDEs).
 */

export type ToolRiskLevel = 'read' | 'local_mutation' | 'production_mutation' | 'destructive'

export type ToolCategory = 'project' | 'database' | 'deployment' | 'service' | 'telemetry'

export interface McpToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  default?: any
  enum?: string[]
}

export interface McpToolDefinition {
  name: string
  category: ToolCategory
  description: string
  risk: ToolRiskLevel
  approvalRequired: boolean
  parameters: Record<string, McpToolParameter>
  requiredParams?: string[]
}

export interface McpExecutionContext {
  projectDir: string
  environment: string
  callerId?: string
  approved?: boolean
  approvalToken?: string
}

export interface McpApprovalRequest {
  tool: string
  action: string
  risk: ToolRiskLevel
  impact: string
  parameters: Record<string, any>
  environment: string
  instructions: string
}

export interface McpToolCallRequest {
  tool: string
  parameters?: Record<string, any>
  environment?: string
  projectDir?: string
  callerId?: string
  approved?: boolean
  approvalToken?: string
}

export interface McpToolCallResponse {
  status: 'success' | 'error' | 'approval_required'
  tool: string
  data?: any
  error?: string
  approval?: McpApprovalRequest
}

export interface McpServerConfig {
  packageName: string
  version: string
  capabilities: string[]
  toolsCount: number
  supportedTransports: string[]
}

export interface McpAuditEntry {
  id: string
  timestamp: string
  tool: string
  risk: ToolRiskLevel
  environment: string
  caller: string
  status: 'executed' | 'approval_required' | 'rejected' | 'failed'
  durationMs: number
  parameters: Record<string, any>
  error?: string
}
