export interface WorkflowNode {
  id: string
  type: string
  label?: string
  config: Record<string, any>
  position?: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  from: string
  to: string
  label?: string
  condition?: string
}

export interface WorkflowDefinition {
  workflowId: string
  name: string
  description?: string
  version?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config?: {
    maxRetries?: number
    timeout?: number
    enableLogging?: boolean
    tags?: string[]
  }
  createdAt?: string
  updatedAt?: string
}

export interface NodeExecutionResult {
  nodeId: string
  nodeType: string
  status: 'success' | 'error' | 'skipped'
  output: any
  error?: string
  startTime: string
  endTime: string
  duration: number
  tokenUsage?: { prompt: number; completion: number; total: number }
}

export interface WorkflowExecutionResult {
  workflowId: string
  executionId: string
  status: 'running' | 'completed' | 'failed' | 'timeout'
  trigger: string
  results: NodeExecutionResult[]
  startTime: string
  endTime?: string
  duration?: number
  error?: string
}

export interface WorkflowRecord {
  id: string
  workflowId: string
  name: string
  description: string
  definition: string
  version: string
  enabled: boolean
  created: string
  updated: string
}

export interface ExecutionRecord {
  id: string
  workflowId: string
  status: string
  trigger: string
  input: string
  output: string
  results: string
  duration: number
  error: string
  created: string
}

export type NodeExecutor = (config: Record<string, any>, input: any, context: ExecutionContext) => Promise<NodeExecutionResult>

export interface ExecutionContext {
  workflowId: string
  executionId: string
  logger: (msg: string, data?: any) => void
  getVariable: (key: string) => any
  setVariable: (key: string, value: any) => void
  abortSignal?: AbortSignal
}

export interface NodeDefinition {
  type: string
  label: string
  description: string
  category: 'trigger' | 'ai' | 'data' | 'action' | 'logic' | 'output'
  icon?: string
  execute: NodeExecutor
  validate?: (config: Record<string, any>) => string[]
  configSchema?: Record<string, any>
  inputs?: number
  outputs?: number
}
