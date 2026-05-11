import { WorkflowDefinition, NodeExecutionResult, WorkflowExecutionResult, ExecutionContext } from './types'
import { getNode } from './node-registry'

export interface WorkflowEngineOptions {
  workflow: WorkflowDefinition
  trigger: string
  input?: any
  timeout?: number
  signal?: AbortSignal
  logger?: (msg: string, data?: any) => void
  getVariable?: (key: string) => any
  setVariable?: (key: string, value: any) => void
}

function defaultLogger(msg: string, data?: any) {
  console.log(`[Workflow] ${msg}`, data ?? '')
}

export class WorkflowEngine {
  private workflow: WorkflowDefinition
  private variables: Map<string, any> = new Map()
  private abortSignal?: AbortSignal

  constructor(options: WorkflowEngineOptions) {
    this.workflow = options.workflow
    this.abortSignal = options.signal
    if (options.getVariable) this.variables.set('_get', options.getVariable)
    if (options.setVariable) this.variables.set('_set', options.setVariable)
  }

  private logger = defaultLogger

  async execute(input?: any): Promise<WorkflowExecutionResult> {
    const startTime = new Date()
    const executionId = `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const results: NodeExecutionResult[] = []

    this.logger(`Starting workflow "${this.workflow.name}" (${executionId})`)

    try {
      // Resolve execution order from edges
      const order = this.resolveExecutionOrder()

      if (order.length === 0 && this.workflow.nodes.length > 0) {
        // No edges defined — execute all nodes sequentially
        for (const node of this.workflow.nodes) {
          if (this.abortSignal?.aborted) throw new Error('Execution aborted')
          const result = await this.executeNode(node, input, executionId)
          results.push(result)
          input = result.output
        }
      } else {
        // Follow the graph
        let currentInput = input
        for (const nodeId of order) {
          if (this.abortSignal?.aborted) throw new Error('Execution aborted')
          const node = this.workflow.nodes.find(n => n.id === nodeId)
          if (!node) {
            results.push({
              nodeId, nodeType: 'unknown', status: 'error', output: null,
              error: `Node ${nodeId} not found`,
              startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 0,
            })
            continue
          }
          const result = await this.executeNode(node, currentInput, executionId)
          results.push(result)

          if (node.type === 'condition') {
            const passed = result.output?.passed
            // Find the edge from this node — follow the right path
            const nextEdge = this.workflow.edges.find(e => e.from === nodeId && (!e.condition || e.condition === 'true') === !!passed)
            currentInput = result.output?.input ?? currentInput
          } else {
            currentInput = result.output
          }

          if (result.status === 'error') break
        }
      }

      const endTime = new Date()
      return {
        workflowId: this.workflow.workflowId,
        executionId,
        status: results.some(r => r.status === 'error') ? 'failed' : 'completed',
        trigger: 'manual',
        results,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      }
    } catch (err: any) {
      const endTime = new Date()
      return {
        workflowId: this.workflow.workflowId,
        executionId,
        status: err.message === 'Execution aborted' ? 'timeout' : 'failed',
        trigger: 'manual',
        results,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
        error: err.message,
      }
    }
  }

  private resolveExecutionOrder(): string[] {
    const { nodes, edges } = this.workflow
    if (edges.length === 0) return nodes.map(n => n.id)

    // Topological sort
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    for (const node of nodes) {
      inDegree.set(node.id, 0)
      adjacency.set(node.id, [])
    }

    for (const edge of edges) {
      adjacency.get(edge.from)?.push(edge.to)
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1)
    }

    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId)
    }

    const order: string[] = []
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      order.push(nodeId)
      for (const neighbor of adjacency.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }

    return order
  }

  private async executeNode(node: any, input: any, executionId: string): Promise<NodeExecutionResult> {
    const nodeDef = getNode(node.type)
    if (!nodeDef) {
      return {
        nodeId: node.id, nodeType: node.type, status: 'error', output: null,
        error: `Unknown node type: "${node.type}"`,
        startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 0,
      }
    }

    const ctx: ExecutionContext = {
      workflowId: this.workflow.workflowId,
      executionId,
      logger: this.logger,
      getVariable: (key) => this.variables.get(key) ?? this.variables.get(`_get`)?.(key),
      setVariable: (key, value) => { this.variables.set(key, value); this.variables.get(`_set`)?.(key, value) },
      abortSignal: this.abortSignal,
    }

    try {
      this.logger(`Executing node "${node.id}" (${node.type})`)
      return await nodeDef.execute(node.config || {}, input, ctx)
    } catch (err: any) {
      return {
        nodeId: node.id, nodeType: node.type, status: 'error', output: null,
        error: err.message,
        startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 0,
      }
    }
  }
}
