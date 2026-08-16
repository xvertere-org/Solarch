import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { quoteIdentifier } from '../utils/sql_safe'
import { createApiError } from '../utils/api_errors'

export function registerMetricsRoutes(app: BaseApp, router: Router): void {
  router.get('/api/metrics', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collections = await app.findAllCollections()
      
      let totalRecords = 0
      let totalAuthUsers = 0
      
      for (const collection of collections) {
        if (collection.type === 'base' || collection.type === 'auth') {
          const tableName = `_r_${collection.id}`
          
          try {
            const hasTable = await app.db().hasTable(tableName)
            if (hasTable) {
              const result = await app.db().queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM ${quoteIdentifier(tableName)}`)
              const count = Number(result?.total || 0)
              totalRecords += count
              if (collection.type === 'auth') {
                totalAuthUsers += count
              }
            }
          } catch {
            // Ignore errors for individual tables
          }
        }
      }
      
      res.json({
        totalCollections: collections.length,
        totalRecords,
        totalAuthUsers
      })
    } catch (err: any) {
      app.logger().error('Failed to aggregate metrics:', err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
}

