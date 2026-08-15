import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
import { BaseApp } from '../core/base'
import { hashPassword } from '../tools/security/crypto'
import { randomBytes } from 'crypto'

export function registerInstallerRoutes(app: BaseApp, router: Router): void {
  router.get('/api/installer/check', async (req: Request, res: Response) => {
    try {
      const tableExists = await app.db().hasTable('_superusers')
      if (!tableExists) {
        return res.json({ installed: false })
      }
      const row = await app.db().queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM _superusers`)
      res.json({ installed: (row?.count ?? 0) > 0 })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.post('/api/installer', async (req: Request, res: Response) => {
    try {
      const { email, password, passwordConfirm } = req.body

      if (!email || !password) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Email and password are required.'))
      }

      if (password !== passwordConfirm) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Passwords do not match.'))
      }

      await app.db().execute(`
        CREATE TABLE IF NOT EXISTS _superusers (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          created TEXT NOT NULL,
          updated TEXT NOT NULL
        )
      `)
      const superuserCount = await app.db().queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM _superusers`
      )

      if ((superuserCount?.count ?? 0) > 0) {
        return res.status(403).json({
          code: 403,
          message: 'Installation already completed.'
        })
      }

      const passwordHash = await hashPassword(password)
      const id = `su_${randomBytes(8).toString('hex')}`
      const now = new Date().toISOString()

      await app.db().execute(
        `INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`,
        [id, email, passwordHash, now, now]
      )

      res.json({ code: 200, message: 'Installer completed.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
}
