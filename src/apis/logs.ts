import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { parsePagination } from '../utils/pagination'

export function registerLogRoutes(app: BaseApp, router: Router): void {
  router.get('/api/logs', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      // FIXED[N-1]: Enforce pagination bounds via shared helper
      const { page, perPage } = parsePagination(req.query)
      const level = req.query.level as string

      let whereClause = ''
      let params: any[] = []

      if (level) {
        whereClause = 'WHERE level = ?'
        params = [level]
      }

      const offset = (page - 1) * perPage
      const countResult = await app.db().queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM _logs ${whereClause}`, params)
      const totalItems = countResult?.total ?? 0
      const totalPages = Math.ceil(totalItems / perPage)

      const rows = await app.db().query(`SELECT * FROM _logs ${whereClause} ORDER BY created DESC LIMIT ? OFFSET ?`, [...params, perPage, offset])

      res.json({
        page,
        perPage,
        totalItems,
        totalPages,
        items: rows,
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.get('/api/logs/stats', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const rows = await app.db().query(`
        SELECT level, COUNT(*) as count
        FROM _logs
        GROUP BY level
      `)

      res.json(rows)
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
}
