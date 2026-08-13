import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'

export function registerHealthRoutes(app: BaseApp, router: Router): void {
  router.get('/api/health', async (req: Request, res: Response) => {
    const isAdmin = req.authContext?.isAdmin ?? false
    const ok = await app.db().ping()
    if (!ok) {
      return res.status(503).json({ code: 503, message: 'Database unavailable', timestamp: new Date().toISOString() })
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
