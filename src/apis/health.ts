import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
import { BaseApp } from '../core/base'

export function registerHealthRoutes(app: BaseApp, router: Router): void {
  router.get('/api/health', async (req: Request, res: Response) => {
    const isAdmin = req.authContext?.isAdmin ?? false
    const ok = await app.db().ping()
    if (!ok) {
      return res.status(503).json(createApiError(503, 'INTERNAL_ERROR', 'Database unavailable'))
    }
    if (isAdmin) {
      res.json({
        code: 200,
        message: 'Healthy',
        timestamp: new Date().toISOString(),
        data: {
          dbConnected: true,
        },
      })
    } else {
      res.json({ status: 'ok' })
    }
  })
}
