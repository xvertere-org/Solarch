import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
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
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Description is required.'))
      }

      const schema = await aiService.generateCollection(description, { dryRun: !!dryRun })
      res.json({ schema, applied: !dryRun })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  aiRouter.post('/generate-rule', async (req: Request, res: Response) => {
    try {
      const { action, description } = req.body
      if (!action || !description) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Action and description are required.'))
      }

      const rule = await aiService.generateRule(action, description)
      res.json({ rule })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  aiRouter.post('/seed', async (req: Request, res: Response) => {
    try {
      const { collectionName, count = 5, constraints } = req.body
      if (!collectionName) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'collectionName is required.'))
      }

      const records = await aiService.seedRecords(collectionName, count, constraints)
      res.json({
        count: records.length,
        records: records.map(r => r.toJSON()),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
  aiRouter.post('/test', async (req: Request, res: Response) => {
    try {
      const { config } = req.body
      let settings = app.settings()
      
      if (config) {
        // dynamically import to avoid circular dependencies if any, but wait, mergeIncomingSettings is exported
        const { mergeIncomingSettings } = require('./settings')
        settings = mergeIncomingSettings(settings, config)
      }

      if (!settings.ai.enabled || !settings.ai.apiKey) {
        return res.status(400).json({ code: 400, message: 'AI is not configured or disabled.' })
      }

      // We need to pass the temporary config to AIService. 
      // AIService gets config via `this.app.settings()`. 
      // But we don't want to save it! 
      // Let's modify AIService to accept optional config, or we instantiate a temporary provider.
      // The easiest way without modifying AIService drastically is to just create the provider here.
      const { createLLMProvider } = require('../ai/provider')
      const provider = createLLMProvider(settings.ai)
      
      const systemPrompt = `You are Solarch AI Assistant. Reply with exactly: Connection successful.`
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Test connection' }
      ]

      const response = await provider.complete(messages)

      res.json({
        success: true,
        reply: response.content.trim(),
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
      const { messages } = req.body

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ code: 400, message: 'Messages array is required and must not be empty.' })
      }

      if (messages.length > 50) {
        return res.status(400).json({ code: 400, message: 'Message limit exceeded. Maximum is 50.' })
      }

      let totalChars = 0
      const validatedMessages = []

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          return res.status(400).json({ code: 400, message: `Invalid role "${msg.role}" at index ${i}. Only user and assistant are allowed.` })
        }
        
        if (typeof msg.content !== 'string') {
          return res.status(400).json({ code: 400, message: `Message content must be a string at index ${i}.` })
        }

        const trimmed = msg.content.trim()
        if (!trimmed) {
          return res.status(400).json({ code: 400, message: `Message content cannot be empty at index ${i}.` })
        }

        if (trimmed.length > 10000) {
          return res.status(400).json({ code: 400, message: `Message content exceeds individual limit of 10,000 characters at index ${i}.` })
        }

        totalChars += trimmed.length
        if (totalChars > 64000) {
          return res.status(400).json({ code: 400, message: 'Total conversation content exceeds aggregate limit of 64,000 characters.' })
        }

        validatedMessages.push({
          role: msg.role,
          content: trimmed
        })
      }

      const finalMessage = validatedMessages[validatedMessages.length - 1]
      if (finalMessage.role !== 'user') {
        return res.status(400).json({ code: 400, message: 'The final message must be from the user.' })
      }

      const reply = await aiService.chat(validatedMessages)
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