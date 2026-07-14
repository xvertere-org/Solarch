import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { generateRandomString } from '../tools/security/crypto'
import { evaluateRule, RecordFieldResolver, RequestInfo } from '../core/record_field_resolver'
import { Mailer } from '../tools/mailer/mailer'
import { EmailTemplateEngine, sendPasswordResetEmail, sendVerificationEmail, sendEmailChangeConfirmation } from '../tools/mailer/templates'
import rateLimit from 'express-rate-limit'

const authFlowRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.body?.email || req.ip || 'unknown'
  },
  message: { code: 429, message: 'Too many requests, please try again later.' },
})

const authFlowConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown'
  },
  message: { code: 429, message: 'Too many requests, please try again later.' },
})

export function registerPasswordResetRoutes(app: BaseApp, router: Router): void {
  const authRouter = Router({ mergeParams: true })
  authRouter.post('/request-password-reset', authFlowRequestLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE email = ?`).get(email) as any
      if (!row) {
        return res.status(204).send()
      }

      const record = new PBRecord(collection.id, collection.name, row)
      const token = app.createPasswordResetToken(record.id, `collection_${collection.id}`, 1)

      const now = new Date().toISOString()
      db.prepare(`UPDATE _r_${collection.id} SET lastResetSentAt = ? WHERE id = ?`).run(now, record.id)

      try {
        const settings = app.settings()
        if (settings.smtp.host) {
          const mailer = Mailer.fromSettings(settings)
          const engine = new EmailTemplateEngine(settings)
          res.setHeader('Referrer-Policy', 'no-referrer')
          await sendPasswordResetEmail(mailer, engine, email, {
            resetURL: `${settings.appURL}/_/#/auth/confirm-password-reset?token=${token}`,
            userName: record.get('name') || record.get('username') || email,
          })
        }
      } catch (emailErr: any) {
        app.logger().warn('Failed to send password reset email', emailErr.message)
      }

      res.json({ code: 200, message: 'Password reset email sent.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })


  authRouter.post('/confirm-password-reset', authFlowConfirmLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password, passwordConfirm } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      if (password !== passwordConfirm) {
        return res.status(400).json({ code: 400, message: 'Passwords do not match.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const minLength = collection.authOptions?.minPasswordLength ?? 8
      if (!password || password.length < minLength) {
        return res.status(400).json({ code: 400, message: `Password must be at least ${minLength} characters.` })
      }

      const tokenType = `collection_${collection.id}`
      if (!app.isPasswordResetTokenValid(token, tokenType)) {
        return res.status(400).json({ code: 400, message: 'Invalid or expired token.' })
      }

      const revoked = app.revokePasswordResetToken(token, tokenType)
      if (!revoked) {
        return res.status(400).json({ code: 400, message: 'Token has already been used.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = (SELECT userId FROM _passwordResetTokens WHERE tokenHash = ? AND type = ?)`).get(
        require('crypto').createHash('sha256').update(token).digest('hex'), tokenType
      ) as any
      if (!row) {
        return res.status(400).json({ code: 400, message: 'Invalid token.' })
      }

      const passwordHash = await app.hashPassword(password)
      db.prepare(`UPDATE _r_${collection.id} SET passwordHash = ?, verified = 1 WHERE id = ?`).run(passwordHash, row.id)

      res.json({ code: 200, message: 'Password reset successfully.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName', authRouter)
}

export function registerVerificationRoutes(app: BaseApp, router: Router): void {
  const authRouter = Router({ mergeParams: true })
  authRouter.post('/request-verification', authFlowRequestLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE email = ?`).get(email) as any
      if (!row) {
        return res.status(204).send()
      }

      const record = new PBRecord(collection.id, collection.name, row)
      const token = app.generateJWT(
        { id: record.id, type: 'verifyEmail', collectionId: collection.id },
        app.getJwtSecret(),
        '2h'
      )

      const now = new Date().toISOString()
      db.prepare(`UPDATE _r_${collection.id} SET lastVerificationSentAt = ? WHERE id = ?`).run(now, record.id)

      try {
        const settings = app.settings()
        if (settings.smtp.host) {
          const mailer = Mailer.fromSettings(settings)
          const engine = new EmailTemplateEngine(settings)
          await sendVerificationEmail(mailer, engine, email, {
            verificationURL: `${settings.appURL}/_/#/auth/confirm-verification?token=${token}`,
            userName: record.get('name') || record.get('username') || email,
          })
        }
      } catch (emailErr: any) {
        app.logger().warn('Failed to send verification email', emailErr.message)
      }

      res.json({ code: 200, message: 'Verification email sent.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/confirm-verification', authFlowConfirmLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const payload = app.parseJWT(token, app.getJwtSecret())
      if (!payload || payload.type !== 'verifyEmail') {
        return res.status(400).json({ code: 400, message: 'Invalid or expired token.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(payload.id) as any
      if (!row) {
        return res.status(400).json({ code: 400, message: 'Invalid token.' })
      }

      db.prepare(`UPDATE _r_${collection.id} SET verified = 1 WHERE id = ?`).run(payload.id)

      res.json({ code: 200, message: 'Email verified successfully.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName', authRouter)
}

export function registerEmailChangeRoutes(app: BaseApp, router: Router): void {
  const authRouter = Router({ mergeParams: true })

  authRouter.post('/request-email-change', authFlowRequestLimiter, async (req: Request, res: Response) => {
    try {
      const { newEmail } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ code: 401, message: 'Authentication required.' })
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
      const payload = app.parseJWT(token, app.getJwtSecret())
      if (!payload || payload.type !== 'auth') {
        return res.status(401).json({ code: 401, message: 'Invalid token.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(payload.id) as any
      if (!row) {
        return res.status(400).json({ code: 400, message: 'Invalid user.' })
      }

      const record = new PBRecord(collection.id, collection.name, row)
      // FIXED[N-5]: Use opaque token instead of JWT for email change
      const changeToken = app.createPasswordResetToken(record.id, `emailChange:${collection.id}`, 2, newEmail)

      try {
        const settings = app.settings()
        if (settings.smtp.host) {
          const mailer = Mailer.fromSettings(settings)
          const engine = new EmailTemplateEngine(settings)
          await sendEmailChangeConfirmation(mailer, engine, newEmail, {
            confirmationURL: `${settings.appURL}/_/#/auth/confirm-email-change?token=${changeToken}`,
            userName: record.get('name') || record.get('username') || record.get('email'),
          })
        }
      } catch (emailErr: any) {
        app.logger().warn('Failed to send email change confirmation', emailErr.message)
      }

      res.json({ code: 200, message: 'Email change confirmation sent.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/confirm-email-change', authFlowConfirmLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.body
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const tokenType = `emailChange:${collection.id}`
      if (!app.isPasswordResetTokenValid(token, tokenType)) {
        return res.status(400).json({ code: 400, message: 'Invalid or expired token.' })
      }

      const tokenData = app.getPasswordResetTokenData(token, tokenType)
      if (!tokenData || !tokenData.data) {
        return res.status(400).json({ code: 400, message: 'Invalid token.' })
      }

      const revoked = app.revokePasswordResetToken(token, tokenType)
      if (!revoked) {
        return res.status(400).json({ code: 400, message: 'Token has already been used.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(tokenData.userId) as any
      if (!row) {
        return res.status(400).json({ code: 400, message: 'Invalid token.' })
      }

      const newEmail = tokenData.data
      const existingEmail = db.prepare(`SELECT id FROM _r_${collection.id} WHERE email = ? AND id != ?`).get(newEmail, tokenData.userId) as any
      if (existingEmail) {
        return res.status(400).json({ code: 400, message: 'Email is already in use.' })
      }
      db.prepare(`UPDATE _r_${collection.id} SET email = ? WHERE id = ?`).run(newEmail, tokenData.userId)

      res.json({ code: 200, message: 'Email changed successfully.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName', authRouter)
}

export function registerImpersonateRoutes(app: BaseApp, router: Router): void {
  const authRouter = Router({ mergeParams: true })

  authRouter.post('/impersonate/:recordId', async (req: Request, res: Response) => {
    try {
      if (!req.authContext?.isAdmin) {
        return res.status(403).json({ code: 403, message: 'Only superusers can impersonate.' })
      }

      const recordId = req.params.recordId
      const collectionIdOrName = req.params.collectionIdOrName

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(recordId) as any
      if (!row) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const record = new PBRecord(collection.id, collection.name, row)
      record.hide('passwordHash')
      record.hide('lastResetSentAt')
      record.hide('lastVerificationSentAt')
      const token = app.generateJWT(
        { id: record.id, type: 'auth', collectionId: collection.id },
        app.getJwtSecret(),
        '1h'
      )

      res.json({ token, record: record.toJSON() })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName', authRouter)
}
