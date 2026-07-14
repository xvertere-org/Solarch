import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth, requireAuth } from './middlewares_auth'
import { rateLimitMiddleware } from './middlewares_rate_limit'
import { listNodes, getNode } from '../agent/node-registry'
import { WorkflowEngine } from '../agent/workflow-engine'
import { WorkflowDefinition } from '../agent/types'

const DEEP_SCRUB_KEYS = new Set([
  'apiKey', 'api_key', 'password', 'passwordHash', 'password_hash', 'mfaSecret', 'mfa_secret',
  'secret', 'token', 'refreshToken', 'accessToken', 'authorization', 'auth',
])

function deepScrub(obj: any, secretKeys: Set<string>): void {
  if (typeof obj !== 'object' || obj === null) return
  for (const key of Object.keys(obj)) {
    if (secretKeys.has(key)) {
      obj[key] = '***'
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepScrub(obj[key], secretKeys)
    }
  }
}

export function registerAgentRoutes(app: BaseApp, router: Router): void {
  const agentRouter = Router()
  agentRouter.use(rateLimitMiddleware(app))
  agentRouter.get('/nodes', async (_req: Request, res: Response) => {
    try {
      res.json({
        code: 200, data: listNodes().map(n => ({
          type: n.type, label: n.label, description: n.description,
          category: n.category, configSchema: n.configSchema,
          inputs: n.inputs ?? 1, outputs: n.outputs ?? 1,
        }))
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.get('/nodes/:type', async (req: Request, res: Response) => {
    try {
      const node = getNode(req.params.type)
      if (!node) return res.status(404).json({ code: 404, message: `Node type "${req.params.type}" not found` })
      res.json({ code: 200, data: { type: node.type, label: node.label, description: node.description, category: node.category, configSchema: node.configSchema } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.post('/workflows/register', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const body = req.body as any
      const workflowId = body.workflowId
      const name = body.name
      if (!workflowId || !name || !body.nodes) {
        return res.status(400).json({ code: 400, message: 'Missing required fields: workflowId, name, nodes' })
      }

      if (typeof workflowId !== 'string' || workflowId.length > 128) {
        return res.status(400).json({ code: 400, message: 'workflowId must be a string (max 128 chars)' })
      }

      if (!Array.isArray(body.nodes)) {
        return res.status(400).json({ code: 400, message: 'nodes must be an array' })
      }

      for (const node of body.nodes) {
        if (!node.type || typeof node.type !== 'string') {
          return res.status(400).json({ code: 400, message: 'Each node must have a valid type' })
        }
        if (!getNode(node.type)) {
          return res.status(400).json({ code: 400, message: `Unknown node type: "${node.type}"` })
        }
      }

      if (body.edges && !Array.isArray(body.edges)) {
        return res.status(400).json({ code: 400, message: 'edges must be an array' })
      }

      const db = app.db().getDataDB()
      const now = new Date().toISOString()
      const id = `wf_${Date.now().toString(36)}_${require('crypto').randomBytes(4).toString('hex')}`
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
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.get('/workflows', requireAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const rows = db.prepare(`SELECT id, workflowId, name, description, version, enabled, created, updated FROM _agentWorkflows ORDER BY updated DESC LIMIT 100`).all() as any[]
      res.json({ code: 200, data: rows })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.get('/workflows/:workflowId', requireAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentWorkflows WHERE workflowId = ?`).get(req.params.workflowId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Workflow not found' })
      const definition = JSON.parse(row.definition)
      const secretKeys = new Set(['apiKey', 'api_key', 'password', 'secret', 'token', 'authorization', 'auth'])
      deepScrub(definition, secretKeys)
      res.json({ code: 200, data: { id: row.id, workflowId: row.workflowId, name: row.name, description: row.description, version: row.version, enabled: row.enabled, created: row.created, updated: row.updated, nodes: definition.nodes, edges: definition.edges, config: definition.config } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.delete('/workflows/:workflowId', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const result = db.prepare(`DELETE FROM _agentWorkflows WHERE workflowId = ?`).run(req.params.workflowId)
      if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Workflow not found' })
      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.post('/workflows/:workflowId/execute', requireSuperuserAuth(app), async (req: Request, res: Response) => {
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

      const engine = new WorkflowEngine({
        workflow: definition,
        trigger: 'api',
        input: req.body?.input,
        app,
      })
      const result = await engine.execute(req.body?.input)

      const executionId = result.executionId
      const now = new Date().toISOString()
      const safeInput = req.body?.input ? JSON.parse(JSON.stringify(req.body.input)) : {}
      deepScrub(safeInput, DEEP_SCRUB_KEYS)
      const safeOutput = result.results[result.results.length - 1]?.output
        ? JSON.parse(JSON.stringify(result.results[result.results.length - 1].output))
        : null
      if (safeOutput) deepScrub(safeOutput, DEEP_SCRUB_KEYS)
      const safeResults = JSON.parse(JSON.stringify(result.results))
      safeResults.forEach((r: any) => { if (r.output) deepScrub(r.output, DEEP_SCRUB_KEYS) })
      db.prepare(`INSERT INTO _agentExecutions (id, workflowId, status, trigger, input, output, results, duration, error, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(executionId, row.workflowId, result.status, 'api', JSON.stringify(safeInput), JSON.stringify(safeOutput), JSON.stringify(safeResults), result.duration || 0, result.error || '', now)
      db.prepare(`DELETE FROM _agentExecutions WHERE workflowId = ? AND id NOT IN (SELECT id FROM _agentExecutions WHERE workflowId = ? ORDER BY created DESC LIMIT 1000)`).run(row.workflowId, row.workflowId)
      const safeResponseResult = JSON.parse(JSON.stringify(result))
      if (safeResponseResult.results) safeResponseResult.results.forEach((r: any) => { if (r.output) deepScrub(r.output, DEEP_SCRUB_KEYS) })
      res.json({ code: 200, data: safeResponseResult })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.get('/workflows/:workflowId/execute/stream', requireSuperuserAuth(app), async (req: Request, res: Response) => {
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

      const rawInput = req.query.input as string | undefined
      const parsedInput = rawInput && rawInput.length < 65536 ? JSON.parse(rawInput) : undefined

      const engine = new WorkflowEngine({
        workflow: definition,
        trigger: 'api',
        input: parsedInput,
        app,
        logger: (msg, data) => {
          const safeData = data ? JSON.parse(JSON.stringify(data)) : data
          if (safeData && typeof safeData === 'object') deepScrub(safeData, DEEP_SCRUB_KEYS)
          res.write(`data: ${JSON.stringify({ type: 'log', message: msg, data: safeData })}\n\n`)
        },
      })

      const result = await engine.execute(parsedInput)
      const safeStreamResult = JSON.parse(JSON.stringify(result))
      if (safeStreamResult.results) safeStreamResult.results.forEach((r: any) => { if (r.output) deepScrub(r.output, DEEP_SCRUB_KEYS) })
      res.write(`data: ${JSON.stringify({ type: 'result', ...safeStreamResult })}\n\n`)
      res.end()
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`)
      res.end()
    }
  })

  agentRouter.get('/workflows/:workflowId/executions', requireAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const rows = db.prepare(`SELECT id, workflowId, status, trigger, duration, error, created FROM _agentExecutions WHERE workflowId = ? ORDER BY created DESC LIMIT 50`).all(req.params.workflowId) as any[]
      res.json({ code: 200, data: rows })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  agentRouter.get('/executions/:executionId', requireAuth(app), async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _agentExecutions WHERE id = ?`).get(req.params.executionId) as any
      if (!row) return res.status(404).json({ code: 404, message: 'Execution not found' })
      const data: any = { ...row, input: JSON.parse(row.input), output: JSON.parse(row.output), results: JSON.parse(row.results) }
      if (!req.authContext?.isAdmin) {
        deepScrub(data.input, DEEP_SCRUB_KEYS)
        if (data.output) deepScrub(data.output, DEEP_SCRUB_KEYS)
        if (Array.isArray(data.results)) data.results.forEach((r: any) => { if (r.output) deepScrub(r.output, DEEP_SCRUB_KEYS) })
      }
      res.json({ code: 200, data })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/agents', agentRouter)
}
