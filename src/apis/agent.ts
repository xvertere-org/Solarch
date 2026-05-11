import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { listNodes, getNode } from '../agent/node-registry'
import { WorkflowEngine } from '../agent/workflow-engine'
import { WorkflowDefinition, WorkflowRecord, ExecutionRecord } from '../agent/types'

export function registerAgentRoutes(app: BaseApp, router: Router): void {
  const agentRouter = Router()

  // List all registered node types
  agentRouter.get('/nodes', async (_req: Request, res: Response) => {
    try {
      res.json({ code: 200, data: listNodes().map(n => ({
        type: n.type, label: n.label, description: n.description,
        category: n.category, configSchema: n.configSchema,
        inputs: n.inputs ?? 1, outputs: n.outputs ?? 1,
      })) })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Get a specific node definition
  agentRouter.get('/nodes/:type', async (req: Request, res: Response) => {
    try {
      const node = getNode(req.params.type)
      if (!node) return res.status(404).json({ code: 404, message: `Node type "${req.params.type}" not found` })
      res.json({ code: 200, data: { type: node.type, label: node.label, description: node.description, category: node.category, configSchema: node.configSchema } })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Register a workflow from Torque
  agentRouter.post('/workflows/register', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const body = req.body as any
      const workflowId = body.workflowId
      const name = body.name
      if (!workflowId || !name || !body.nodes) {
        return res.status(400).json({ code: 400, message: 'Missing required fields: workflowId, name, nodes' })
      }

      for (const node of body.nodes) {
        if (!getNode(node.type)) {
          return res.status(400).json({ code: 400, message: `Unknown node type: "${node.type}"` })
        }
      }

      const db = app.db().getDataDB()
      const now = new Date().toISOString()
      const id = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const version = body.version || body.config?.version || '1'

      const existing = db.prepare(`SELECT id FROM _agentWorkflows WHERE workflowId = ?`).get(workflowId) as any
      if (existing) {
        db.prepare(`UPDATE _agentWorkflows SET name = ?, description = ?, definition = ?, version = ?, updated = ? WHERE workflowId = ?`)
          .run(name, body.description || '', JSON.stringify({ nodes: body.nodes, edges: body.edges || [], config: body.config }), version, now, workflowId)
        return res.json({ code: 200, message: `Workflow "${workflowId}" updated`, data: { workflowId } })
      }

      db.prepare(`INSERT INTO _agentWorkflows (id, workflowId, name, description, definition, version, enabled, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, workflowId, name, body.description || '', JSON.stringify({ nodes: body.nodes, edges: body.edges || [], config: body.config }), version, 1, now, now)

      res.status(201).json({ code: 201, message: `Workflow "${workflowId}" registered`, data: { workflowId, id } })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // List all registered workflows
  agentRouter.get('/workflows', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const rows = db.prepare(`SELECT id, workflowId, name, description, version, enabled, created, updated FROM _agentWorkflows ORDER BY updated DESC`).all() as any[]
      res.json({ code: 200, data: rows })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Get a workflow definition
  agentRouter.get('/workflows/:workflowId', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentWorkflows WHERE workflowId = ?`).get(req.params.workflowId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Workflow not found' })

      const definition = JSON.parse(row.definition)
      res.json({ code: 200, data: { id: row.id, workflowId: row.workflowId, name: row.name, description: row.description, version: row.version, enabled: row.enabled, created: row.created, updated: row.updated, nodes: definition.nodes, edges: definition.edges, config: definition.config } })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Delete a workflow
  agentRouter.delete('/workflows/:workflowId', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const result = db.prepare(`DELETE FROM _agentWorkflows WHERE workflowId = ?`).run(req.params.workflowId)
      if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Workflow not found' })
      res.status(204).send()
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Execute a workflow
  agentRouter.post('/workflows/:workflowId/execute', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentWorkflows WHERE workflowId = ?`).get(req.params.workflowId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Workflow not found' })
      if (!row.enabled) return res.status(403).json({ code: 403, message: 'Workflow is disabled' })

      const definition: WorkflowDefinition = {
        workflowId: row.workflowId,
        name: row.name,
        ...JSON.parse(row.definition),
      }

      const engine = new WorkflowEngine({ workflow: definition, trigger: 'api', input: req.body?.input })
      const result = await engine.execute(req.body?.input)

      // Save execution record
      const executionId = result.executionId
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO _agentExecutions (id, workflowId, status, trigger, input, output, results, duration, error, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(executionId, row.workflowId, result.status, 'api', JSON.stringify(req.body?.input || {}), JSON.stringify(result.results[result.results.length - 1]?.output || null), JSON.stringify(result.results), result.duration || 0, result.error || '', now)

      res.json({ code: 200, data: result })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Stream workflow execution (SSE)
  agentRouter.get('/workflows/:workflowId/execute/stream', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentWorkflows WHERE workflowId = ?`).get(req.params.workflowId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Workflow not found' })

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      const definition: WorkflowDefinition = {
        workflowId: row.workflowId,
        name: row.name,
        ...JSON.parse(row.definition),
      }

      const engine = new WorkflowEngine({
        workflow: definition,
        trigger: 'api',
        input: req.query.input ? JSON.parse(req.query.input as string) : undefined,
        logger: (msg, data) => {
          res.write(`data: ${JSON.stringify({ type: 'log', message: msg, data })}\n\n`)
        },
      })

      const result = await engine.execute(req.query.input ? JSON.parse(req.query.input as string) : undefined)
      res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`)
      res.end()
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      res.end()
    }
  })

  // List execution history for a workflow
  agentRouter.get('/workflows/:workflowId/executions', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const rows = db.prepare(`SELECT id, workflowId, status, trigger, duration, error, created FROM _agentExecutions WHERE workflowId = ? ORDER BY created DESC LIMIT 50`).all(req.params.workflowId) as any[]
      res.json({ code: 200, data: rows })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // Get a single execution detail
  agentRouter.get('/executions/:executionId', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentExecutions WHERE id = ?`).get(req.params.executionId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Execution not found' })
      res.json({ code: 200, data: { ...row, input: JSON.parse(row.input), output: JSON.parse(row.output), results: JSON.parse(row.results) } })
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  router.use('/api/agents', agentRouter)
}
