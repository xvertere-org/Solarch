import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { AIService } from '../ai/service'


export function registerAIRoutes(app: BaseApp, router: Router): void {
  const aiRouter = Router()
  const aiService = new AIService(app)

  // All AI endpoints require superuser auth for security
  aiRouter.use(requireSuperuserAuth(app))

  aiRouter.post('/generate-collection', async (req: Request, res: Response) => {
    try {
      const { description, dryRun } = req.body
      if (!description) {
        return res.status(400).json({ code: 400, message: 'Description is required.' })
      }

      const schema = await aiService.generateCollection(description, { dryRun: !!dryRun })
      res.json({ schema, applied: !dryRun })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  aiRouter.post('/generate-rule', async (req: Request, res: Response) => {
    try {
      const { action, description } = req.body
      if (!action || !description) {
        return res.status(400).json({ code: 400, message: 'Action and description are required.' })
      }

      const rule = await aiService.generateRule(action, description)
      res.json({ rule })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  aiRouter.post('/seed', async (req: Request, res: Response) => {
    try {
      const { collectionName, count = 5, constraints } = req.body
      if (!collectionName) {
        return res.status(400).json({ code: 400, message: 'collectionName is required.' })
      }

      const records = await aiService.seedRecords(collectionName, count, constraints)
      res.json({
        count: records.length,
        records: records.map(r => r.toJSON()),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
  aiRouter.post('/test', async (req: Request, res: Response) => {
    try {
      const reply = await aiService.chat('Reply with exactly: Connection successful.')

      res.json({
        success: true,
        reply,
      })
    } catch (err: any) {
      app.logger().error(err.message || err)

      res.status(500).json({
        success: false,
        message: err.message || 'AI connection failed.',
      })
    }
  })

  aiRouter.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message } = req.body

      if (!message) {
        return res.status(400).json({
          code: 400,
          message: 'Message is required.',
        })
      }

      const reply = await aiService.chat(message)
      res.json({ reply })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      })
    }
  })

  router.use('/api/ai', aiRouter)
}