import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { verifyPassword, generateJWT, hashPassword as hashPasswordAsync } from '../tools/security/crypto'
import { Mailer } from '../tools/mailer/mailer'
import { EmailTemplateEngine, sendPasswordResetEmail } from '../tools/mailer/templates'
import rateLimit from 'express-rate-limit'
import { recordFailedAttempt, isLockedOut, clearAttempts } from '../utils/lockout'
import { createApiError } from '../utils/api_errors'

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
    res.status(429).json(createApiError(429, 'RATE_LIMITED', 'Too many authentication attempts, please try again later.', { retryAfter: 900 }))
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
    res.status(429).json(createApiError(429, 'RATE_LIMITED', 'Too many password reset requests, please try again later.'))
  },
})

export function registerAdminAuthRoutes(app: BaseApp, router: Router): void {
  router.post('/api/admins/auth-with-password', adminAuthRateLimiter, async (req: Request, res: Response) => {
    try {
      const { identity, password } = req.body
      if (!identity || !password) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Missing identity or password.'))
      }

      if (isLockedOut(`admin:${identity.toLowerCase()}`)) {
        return res.status(429).json(createApiError(429, 'RATE_LIMITED', 'Account temporarily locked. Try again later.'))
      }

      const tableExists = await app.db().hasTable('_superusers')
      if (!tableExists) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json(createApiError(400, 'UNAUTHORIZED', 'Invalid credentials.'))
      }

      const row = await app.db().queryOne<any>(`SELECT * FROM _superusers WHERE email = ?`, [identity])

      if (!row) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json(createApiError(400, 'UNAUTHORIZED', 'Invalid credentials.'))
      }

      const valid = await verifyPassword(password, row.passwordHash)
      if (!valid) {
        recordFailedAttempt(`admin:${identity.toLowerCase()}`)
        return res.status(400).json(createApiError(400, 'UNAUTHORIZED', 'Invalid credentials.'))
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
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.post('/api/admins/refresh', adminAuthRateLimiter, async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(createApiError(401, 'UNAUTHORIZED', 'Missing token.'))
      }

      const token = authHeader.slice(7)

      if (await app.isTokenRevoked(token, 'admin_refresh')) {
        return res.status(401).json(createApiError(401, 'UNAUTHORIZED', 'Token has been revoked.'))
      }

      const secret = app.getJwtSecret()
      const payload = app.parseJWT(token, secret)
      if (!payload || payload.type !== 'admin') {
        return res.status(401).json(createApiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'))
      }

      await app.revokeToken(token, 'admin_refresh', payload.id, 5)

      const row = await app.db().queryOne<any>(`SELECT * FROM _superusers WHERE id = ?`, [payload.id])
      if (!row) {
        return res.status(401).json(createApiError(401, 'UNAUTHORIZED', 'Admin not found.'))
      }

      const newToken = app.generateJWT(
        { id: row.id, type: 'admin' },
        app.getJwtSecret(),
        '720h'
      )

      res.json({ token: newToken, admin: { id: row.id, email: row.email } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.post('/api/admins/request-password-reset', adminResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      if (!email) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Missing email.'))
      }

      const tableExists = await app.db().hasTable('_superusers')
      if (!tableExists) {
        return res.status(204).send()
      }

      const row = await app.db().queryOne<any>(`SELECT * FROM _superusers WHERE email = ?`, [email])
      if (!row) {
        return res.status(204).send()
      }

      const token = await app.createPasswordResetToken(row.id, 'admin', 1)
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
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.post('/api/admins/confirm-password-reset', adminResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password, passwordConfirm } = req.body
      if (!token || !password) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Missing token or password.'))
      }
      if (password !== passwordConfirm) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Passwords do not match.'))
      }
      if (!password || password.length < 10) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Password must be at least 10 characters.'))
      }

      const validToken = await app.isPasswordResetTokenValid(token, 'admin')
      if (!validToken) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Invalid or expired token.'))
      }

      const tokenData = await app.getPasswordResetTokenData(token, 'admin')
      const revoked = await app.revokePasswordResetToken(token, 'admin')
      if (!revoked || !tokenData) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Token has already been used.'))
      }

      const row = await app.db().queryOne<any>(`SELECT * FROM _superusers WHERE id = ?`, [tokenData.userId])
      if (!row) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Invalid token.'))
      }

      const passwordHash = await hashPasswordAsync(password)
      await app.db().execute(`UPDATE _superusers SET passwordHash = ? WHERE id = ?`, [passwordHash, row.id])

      res.json({ code: 200, message: 'Password reset successfully.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })
}
