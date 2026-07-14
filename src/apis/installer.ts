import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { hashPassword } from '../tools/security/crypto'
import { randomBytes } from 'crypto'

export function registerInstallerRoutes(app: BaseApp, router: Router): void {
  router.get('/api/installer/check', async (req: Request, res: Response) => {
    try {
      const db = app.db().getDataDB()
      const hasTable = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='_superusers'`).get() as { count: number }
      if (hasTable.count === 0) {
        return res.json({ installed: false })
      }
      const row = db.prepare(`SELECT COUNT(*) as count FROM _superusers`).get() as { count: number }
      res.json({ installed: row.count > 0 })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/installer', async (req: Request, res: Response) => {
    try {
      const { email, password, passwordConfirm } = req.body

      if (!email || !password) {
        return res.status(400).json({ code: 400, message: 'Email and password are required.' })
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ code: 400, message: 'Passwords do not match.' })
      }

      const db = app.db().getDataDB()
      db.exec(`
        CREATE TABLE IF NOT EXISTS _superusers (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          created TEXT NOT NULL,
          updated TEXT NOT NULL
        )
      `)
      const superuserCount = db.prepare(
        `SELECT COUNT(*) as count FROM _superusers`
      ).get() as { count: number }

      if (superuserCount.count > 0) {
        return res.status(403).json({
          code: 403,
          message: 'Installation already completed.'
        })
      }

      const passwordHash = await hashPassword(password)
      const id = `su_${randomBytes(8).toString('hex')}`
      const now = new Date().toISOString()

      db.prepare(
        `INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`
      ).run(id, email, passwordHash, now, now)

      res.json({ code: 200, message: 'Installer completed.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}
