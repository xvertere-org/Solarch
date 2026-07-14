import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { verifyPassword, generateJWT, hashPassword as hashPasswordAsync } from '../tools/security/crypto'
import { Mailer } from '../tools/mailer/mailer'
import { EmailTemplateEngine, sendPasswordResetEmail } from '../tools/mailer/templates'
import rateLimit from 'express-rate-limit'
import { recordFailedAttempt, isLockedOut, clearAttempts } from '../utils/lockout'

const adminAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const identity = req.body?.identity || 'unknown'
    return `${ip}:${identity}`
  },
  message: { code: 429, message: 'Too many authentication attempts, please try again later.' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      code: 429,
      message: 'Too many authentication attempts, please try again later.',
      data: { retryAfter: 900 },
    })
  },
})

const adminResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.body?.email || req.ip || 'unknown'
  },
  message: { code: 429, message: 'Too many password reset requests, please try again later.' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      code: 429,
      message: 'Too many password reset requests, please try again later.',
    })
  },
})

export function registerAdminAuthRoutes(app: BaseApp, router: Router): void {
  router.post('/api/admins/auth-with-password', adminAuthRateLimiter, async (req: Request, res: Response) => {
    try {
      const { identity, password } = req.body
      if (!identity || !password) {
        return res.status(400).json({ code: 400, message: 'Missing identity or password.' })
      }


      if (isLockedOut(`admin:${identity.toLowerCase()}`)) {
        return res.status(429).json({ code: 429, message: 'Account temporarily locked. Try again later.' })
      }

      const db = app.db().getDataDB()
      const hasTable = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='_superusers'`).get() as { count: number }
      if (hasTable.count === 0) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json({ code: 400, message: 'Invalid credentials.' })
      }

      const row = db.prepare(`SELECT * FROM _superusers WHERE email = ?`).get(identity) as any
      if (!row) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json({ code: 400, message: 'Invalid credentials.' })
      }

      const valid = await verifyPassword(password, row.passwordHash)
      if (!valid) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json({ code: 400, message: 'Invalid credentials.' })
      }

      clearAttempts(`admin:${identity.toLowerCase()}`)

      const token = app.generateJWT(
        { id: row.id, type: 'admin' },
        app.getJwtSecret(),
        '720h'
      )

      res.json({ token, admin: { id: row.id, email: row.email } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })


  router.post('/api/admins/refresh', adminAuthRateLimiter, async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ code: 401, message: 'Missing authorization header.' })
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

      if (app.isTokenRevoked(token, 'admin_refresh')) {
        return res.status(401).json({ code: 401, message: 'Token has been revoked.' })
      }

      const secret = app.getJwtSecret()
      const payload = app.parseJWT(token, secret)
      if (!payload || payload.type !== 'admin') {
        return res.status(401).json({ code: 401, message: 'Invalid or expired token.' })
      }

      app.revokeToken(token, 'admin_refresh', payload.id, 5)

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _superusers WHERE id = ?`).get(payload.id) as any
      if (!row) {
        return res.status(401).json({ code: 401, message: 'Admin not found.' })
      }

      const newToken = app.generateJWT(
        { id: row.id, type: 'admin' },
        app.getJwtSecret(),
        '720h'
      )

      res.json({ token: newToken, admin: { id: row.id, email: row.email } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/admins/request-password-reset', adminResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      if (!email) {
        return res.status(400).json({ code: 400, message: 'Missing email.' })
      }

      const db = app.db().getDataDB()
      const hasTable = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='_superusers'`).get() as { count: number }
      if (hasTable.count === 0) {
        return res.status(204).send()
      }

      const row = db.prepare(`SELECT * FROM _superusers WHERE email = ?`).get(email) as any
      if (!row) {
        return res.status(204).send()
      }

      const token = app.createPasswordResetToken(row.id, 'admin', 1)
      try {
        const settings = app.settings()
        if (settings.smtp.host) {
          const mailer = Mailer.fromSettings(settings)
          const engine = new EmailTemplateEngine(settings)
          res.setHeader('Referrer-Policy', 'no-referrer')
          await sendPasswordResetEmail(mailer, engine, email, {
            resetURL: `${settings.appURL}/_/#/admin/confirm-password-reset?token=${token}`,
            userName: row.email,
          })
        }
      } catch (emailErr: any) {
        app.logger().warn('Failed to send admin password reset email', emailErr.message)
      }

      res.json({ code: 200, message: 'Password reset email sent.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  // FIXED[H-1]: Added rate limiting to admin password reset confirmation
  router.post('/api/admins/confirm-password-reset', adminResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password, passwordConfirm } = req.body
      if (!token || !password) {
        return res.status(400).json({ code: 400, message: 'Missing token or password.' })
      }
      if (password !== passwordConfirm) {
        return res.status(400).json({ code: 400, message: 'Passwords do not match.' })
      }
      if (!password || password.length < 10) {
        return res.status(400).json({ code: 400, message: 'Password must be at least 10 characters.' })
      }

      if (!app.isPasswordResetTokenValid(token, 'admin')) {
        return res.status(400).json({ code: 400, message: 'Invalid or expired token.' })
      }

      const revoked = app.revokePasswordResetToken(token, 'admin')
      if (!revoked) {
        return res.status(400).json({ code: 400, message: 'Token has already been used.' })
      }

      const row = app.db().getDataDB().prepare(`SELECT * FROM _superusers WHERE id = (SELECT userId FROM _passwordResetTokens WHERE tokenHash = ? AND type = ?)`).get(
        require('crypto').createHash('sha256').update(token).digest('hex'), 'admin'
      ) as any
      if (!row) {
        return res.status(400).json({ code: 400, message: 'Invalid token.' })
      }

      const passwordHash = await hashPasswordAsync(password)
      app.db().getDataDB().prepare(`UPDATE _superusers SET passwordHash = ? WHERE id = ?`).run(passwordHash, row.id)

      res.json({ code: 200, message: 'Password reset successfully.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}
