import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { Collection } from '../core/collection'
import { hashPassword, verifyPassword, generateJWT, parseJWT, generateRandomString, generateToken } from '../tools/security/crypto'
import { oauth2Registry, handleOAuth2Callback, linkExternalAuth } from '../tools/auth/oauth2'
import { OTP } from '../core/auth_models'
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import { recordFailedAttempt, isLockedOut, clearAttempts } from '../utils/lockout'
import { quoteIdentifier } from '../utils/sql_safe'

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
    })
  },
})

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const email = req.body?.email || req.ip || 'unknown'
    return email
  },
  message: { code: 429, message: 'Too many OTP requests, please try again later.' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      code: 429,
      message: 'Too many OTP requests, please try again later.',
    })
  },
})
const otpVerifyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const otpId = req.body?.otpId || 'unknown'
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    return `${ip}:${otpId}`
  },
  message: { code: 429, message: 'Too many OTP attempts, please try again later.' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      code: 429,
      message: 'Too many OTP attempts, please try again later.',
      data: { retryAfter: 60 },
    })
  },
})

export function registerAuthRoutes(app: BaseApp, router: Router): void {
  const authRouter = Router({ mergeParams: true })

  authRouter.post('/auth-with-password', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { identity, password, collectionIdOrName } = req.body
      if (!identity || !password) {
        return res.status(400).json({ code: 400, message: 'Missing identity or password.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName ?? 'users')
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }
      const lockoutKey = `record:${collection.id}:${identity.toLowerCase()}`
      if (isLockedOut(lockoutKey)) {
        return res.status(429).json({ code: 429, message: 'Account temporarily locked. Try again later.' })
      }

      const db = app.db().getDataDB()
      const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(`_r_${collection.id}`)})`).all() as Array<{ name: string }>
      const hasUsername = columns.some(c => c.name === 'username')

      let row: any
      const qt = quoteIdentifier(`_r_${collection.id}`)
      if (hasUsername) {
        row = db.prepare(
          `SELECT * FROM ${qt} WHERE email = ? OR username = ?`
        ).get(identity, identity) as any
      } else {
        row = db.prepare(
          `SELECT * FROM ${qt} WHERE email = ?`
        ).get(identity) as any
      }

      if (!row) {
        recordFailedAttempt(lockoutKey)
        return res.status(400).json({ code: 400, message: 'Invalid login credentials.' })
      }

      const passwordHash = row.passwordHash
      const valid = await verifyPassword(password, passwordHash)
      if (!valid) {
        recordFailedAttempt(lockoutKey)
        return res.status(400).json({ code: 400, message: 'Invalid login credentials.' })
      }
      clearAttempts(lockoutKey)
      if (collection.authOptions?.onlyVerified && !row.verified) {
        return res.status(403).json({ code: 403, message: 'Email not verified.' })
      }

      const mfaCheck = db.prepare(`SELECT id, method FROM _mfas WHERE recordRef = ? AND collectionId = ?`).get(row.id, collection.id) as any
      if (mfaCheck) {
        const mfaToken = app.generateJWT(
          { id: row.id, type: 'mfa', collectionId: collection.id, mfaId: mfaCheck.id },
          app.getJwtSecret(),
          '5m'
        )
        return res.json({ mfaRequired: true, mfaId: mfaCheck.id, token: mfaToken })
      }

      const record = new PBRecord(collection.id, collection.name, row)
      record.hide('passwordHash')
      record.hide('lastResetSentAt')
      record.hide('lastVerificationSentAt')
      const token = app.generateJWT(
        { id: record.id, type: 'auth', collectionId: collection.id },
        app.getJwtSecret(),
        '720h'
      )
      db.prepare(`UPDATE ${quoteIdentifier(`_r_${collection.id}`)} SET lastLoginAt = ? WHERE id = ?`).run(new Date().toISOString(), record.id)

      res.json({ token, record: record.toJSON() })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/auth-with-oauth2', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { provider, code, codeVerifier, redirectURL, createData, state } = req.body
      const collectionIdOrName = req.params.collectionIdOrName ?? 'users'

      if (!provider || !code) {
        return res.status(400).json({ code: 400, message: 'Missing provider or code.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      if (!collection.authOptions?.allowOAuth2Auth) {
        return res.status(403).json({ code: 403, message: 'OAuth2 is not enabled for this collection.' })
      }

      if (redirectURL) {
        try {
          const parsed = new URL(redirectURL)
          const appUrl = app.settings().appURL
          if (!appUrl) {
            return res.status(400).json({ code: 400, message: 'appURL is not configured. Set it in settings.' })
          }
          const allowedOrigins = [appUrl, appUrl.replace(/\/+$/, '')]
          const isAllowed = allowedOrigins.some(ao => {
            try {
              const allowedUrl = new URL(ao)
              return parsed.origin === allowedUrl.origin && parsed.protocol === allowedUrl.protocol
            } catch {
              return redirectURL.startsWith(ao)
            }
          })
          if (!isAllowed) {
            return res.status(400).json({ code: 400, message: 'Invalid redirect URL.' })
          }
        } catch {
          return res.status(400).json({ code: 400, message: 'Invalid redirect URL.' })
        }
      }

      const db = app.db().getDataDB()

      if (state) {
        const stateRow = db.prepare(
          `SELECT * FROM _oauth2States WHERE state = ? AND collectionId = ? AND expiresAt > ?`
        ).get(state, collection.id, new Date().toISOString()) as any
        if (!stateRow) {
          return res.status(403).json({ code: 403, message: 'Invalid or expired OAuth2 state.' })
        }
        db.prepare(`DELETE FROM _oauth2States WHERE state = ?`).run(state)
      }
      const { user: oauthUser } = await handleOAuth2Callback(app, provider, code, codeVerifier, redirectURL)
      const existingAuth = db.prepare(
        `SELECT * FROM _externalAuths WHERE provider = ? AND providerId = ?`
      ).get(provider, oauthUser.id) as any

      let record: PBRecord

      if (existingAuth) {
        const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(existingAuth.recordRef) as any
        if (!row) {
          return res.status(400).json({ code: 400, message: 'Associated record not found.' })
        }
        record = new PBRecord(collection.id, collection.name, row)
      } else {
        if (oauthUser.email) {
          const existingRow = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE email = ?`).get(oauthUser.email) as any
          if (existingRow) {
            record = new PBRecord(collection.id, collection.name, existingRow)
            await linkExternalAuth(app, record, provider, oauthUser.id)
          } else {
            const allowedCreateFields = ['email', 'name', 'avatar']
            const safeCreateData: Record<string, any> = {}
            if (createData && typeof createData === 'object') {
              for (const key of allowedCreateFields) {
                if (createData[key] !== undefined) {
                  safeCreateData[key] = createData[key]
                }
              }
            }
            const data: any = {
              collectionId: collection.id,
              collectionName: collection.name,
              email: oauthUser.email,
              emailVisibility: true,
              verified: true,
              name: oauthUser.name,
              ...safeCreateData,
            }
            record = new PBRecord(collection.id, collection.name, data)
            await app.save(record)
            await linkExternalAuth(app, record, provider, oauthUser.id)
          }
        } else {
          return res.status(400).json({ code: 400, message: 'OAuth2 provider did not return email.' })
        }
      }

      const token = app.generateJWT(
        { id: record.id, type: 'auth', collectionId: collection.id },
        app.getJwtSecret(),
        '720h'
      )
      record.hide('passwordHash')
      record.hide('lastResetSentAt')
      record.hide('lastVerificationSentAt')
      res.json({ token, record: record.toJSON(), meta: { isNew: !existingAuth } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/auth-with-otp', otpVerifyRateLimiter, async (req: Request, res: Response) => {
    try {
      const { otpId, password, collectionIdOrName } = req.body
      if (!otpId || !password) {
        return res.status(400).json({ code: 400, message: 'Missing otpId or password.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName ?? 'users')
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const otpRow = db.prepare(`SELECT * FROM _otps WHERE id = ? AND collectionId = ?`).get(otpId, collection.id) as any
      if (!otpRow) {
        return res.status(400).json({ code: 400, message: 'Invalid or expired OTP.' })
      }

      const otp = new OTP(otpRow)
      if (otp.isExpired()) {
        db.prepare(`DELETE FROM _otps WHERE id = ?`).run(otpId)
        return res.status(400).json({ code: 400, message: 'OTP has expired.' })
      }
      const incomingHash = createHash('sha256').update(password).digest()
      const storedHash = Buffer.from(otp.password, 'hex')
      if (storedHash.length !== incomingHash.length || !timingSafeEqual(storedHash, incomingHash)) {
        return res.status(400).json({ code: 400, message: 'Invalid OTP password.' })
      }

      const recordRow = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(otp.recordRef) as any
      if (!recordRow) {
        return res.status(400).json({ code: 400, message: 'Associated record not found.' })
      }

      const record = new PBRecord(collection.id, collection.name, recordRow)
      const token = app.generateJWT(
        { id: record.id, type: 'auth', collectionId: collection.id },
        app.getJwtSecret(),
        '720h'
      )
      db.prepare(`DELETE FROM _otps WHERE id = ?`).run(otpId)
      db.prepare(`UPDATE ${quoteIdentifier(`_r_${collection.id}`)} SET lastLoginAt = ? WHERE id = ?`).run(new Date().toISOString(), record.id)

      record.hide('passwordHash')
      record.hide('lastResetSentAt')
      record.hide('lastVerificationSentAt')
      res.json({ token, record: record.toJSON() })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/request-otp', otpRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, collectionIdOrName } = req.body
      if (!email) {
        return res.status(400).json({ code: 400, message: 'Missing email.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName ?? 'users')
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE email = ?`).get(email) as any
      if (!row) {
        return res.json({ otpId: '' })
      }

      const record = new PBRecord(collection.id, collection.name, row)
      const otpPassword = randomInt(100000, 1000000).toString()
      const otpId = generateRandomString(16)
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      const requestIp = req.ip || req.socket.remoteAddress || 'unknown'

      db.prepare(`DELETE FROM _otps WHERE recordRef = ? AND collectionId = ?`).run(record.id, collection.id)
      const otpHash = createHash('sha256').update(otpPassword).digest('hex')
      db.prepare(
        `INSERT INTO _otps (id, recordRef, collectionId, password, sentTo, created, updated, createdAt, expiresAt, requestIp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(otpId, record.id, collection.id, otpHash, email, now, now, now, expiresAt, requestIp)
      const settings = app.settings()
      if (settings.smtp.host) {
        try {
          const { Mailer } = await import('../tools/mailer/mailer.js')
          const { EmailTemplateEngine, sendOTPEmail } = await import('../tools/mailer/templates.js')
          const mailer = Mailer.fromSettings(settings)
          const engine = new EmailTemplateEngine(settings)
          await sendOTPEmail(mailer, engine, email, { otp: otpPassword })
        } catch (emailErr: any) {
          app.logger().warn('Failed to send OTP email', emailErr.message)
        }
      }

      res.json({ otpId })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  // FIXED[H-2]: Added rate limiting to record auth refresh
  authRouter.post('/refresh', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.body
      if (!token) {
        return res.status(400).json({ code: 400, message: 'Token is required.' })
      }

      if (app.isTokenRevoked(token, 'refresh')) {
        return res.status(401).json({ code: 401, message: 'Token has been revoked.' })
      }

      const secret = app.getJwtSecret()
      const payload = app.parseJWT(token, secret)
      if (!payload || payload.type !== 'auth') {
        return res.status(401).json({ code: 401, message: 'Invalid token.' })
      }

      app.revokeToken(token, 'refresh', payload.id, 5)

      const newToken = app.generateJWT(
        { id: payload.id, type: 'auth', collectionId: payload.collectionId },
        app.getJwtSecret(),
        '720h'
      )

      res.json({ token: newToken })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/mfa/setup', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ code: 401, message: 'Authentication required.' })
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
      const payload = app.parseJWT(token, app.getJwtSecret())
      if (!payload || payload.type !== 'auth') {
        return res.status(401).json({ code: 401, message: 'Invalid token.' })
      }

      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const recordRow = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(payload.id) as any
      if (!recordRow) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const secret = generateRandomString(32)
      const rawBackupCodes = Array.from({ length: 8 }, () => randomInt(10000000, 100000000).toString())
      const hashedBackupCodes = rawBackupCodes.map(c => createHash('sha256').update(c).digest('hex'))
      const backupCodes = rawBackupCodes

      const now = new Date().toISOString()
      const mfaId = generateRandomString(16)
      db.prepare(
        `INSERT INTO _mfas (id, recordRef, collectionId, method, secret, backupCodes, created, updated, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(mfaId, payload.id, collection.id, 'totp', secret, JSON.stringify(hashedBackupCodes), now, now, now, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString())

      res.json({
        secret,
        backupCodes: rawBackupCodes,
        qrURL: `otpauth://totp/${collection.name}:${recordRow.email || payload.id}?secret=${secret}&issuer=${app.settings().appName || 'Solarch'}`,
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.post('/mfa/verify', async (req: Request, res: Response) => {
    try {
      const { code } = req.body
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ code: 401, message: 'Authentication required.' })
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
      const payload = app.parseJWT(token, app.getJwtSecret())
      if (!payload || !['auth', 'mfa'].includes(payload.type)) {
        return res.status(401).json({ code: 401, message: 'Invalid token.' })
      }

      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection || !collection.isAuth()) {
        return res.status(400).json({ code: 400, message: 'Invalid collection.' })
      }

      const db = app.db().getDataDB()
      const mfaRow = db.prepare(`SELECT * FROM _mfas WHERE recordRef = ? AND collectionId = ? AND method = 'totp'`).get(payload.id, collection.id) as any
      if (!mfaRow) {
        return res.status(400).json({ code: 400, message: 'MFA not set up.' })
      }

      const expectedCode = generateTOTPCode(mfaRow.secret || mfaRow.id)
      if (code !== expectedCode) {
        return res.status(400).json({ code: 400, message: 'Invalid MFA code.' })
      }

      if (payload.type === 'mfa') {
        const recordRow = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(payload.id) as any
        if (!recordRow) {
          return res.status(404).json({ code: 404, message: 'Record not found.' })
        }
        const record = new PBRecord(collection.id, collection.name, recordRow)
        record.hide('passwordHash')
        record.hide('lastResetSentAt')
        record.hide('lastVerificationSentAt')
        const authToken = app.generateJWT(
          { id: payload.id, type: 'auth', collectionId: collection.id },
          app.getJwtSecret(),
          '720h'
        )
        db.prepare(`UPDATE ${quoteIdentifier(`_r_${collection.id}`)} SET lastLoginAt = ? WHERE id = ?`).run(new Date().toISOString(), payload.id)
        return res.json({ verified: true, token: authToken, record: record.toJSON() })
      }

      res.json({ verified: true })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.get('/methods', async (req: Request, res: Response) => {
    try {
      const collections = await app.findAllCollections(['auth'])
      const authMethods = collections.map(c => ({
        name: c.name,
        collectionId: c.id,
        allowPasswordAuth: c.authOptions?.allowEmailAuth ?? true,
        allowOAuth2Auth: c.authOptions?.allowOAuth2Auth ?? false,
        allowOTPAuth: true,
        oauth2Providers: oauth2Registry.list().map(p => ({
          name: p.name,
          displayName: p.displayName,
          authURL: p.getAuthURL(''),
          pkce: p.pkce,
        })),
      }))

      res.json({ authMethods, mfa: { enabled: true }, otp: { enabled: true } })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  authRouter.get('/external-auths', async (req: Request, res: Response) => {
    try {
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
      const rows = db.prepare(
        `SELECT * FROM _externalAuths WHERE recordRef = ? AND collectionId = ?`
      ).all(payload.id, collection.id) as any[]

      res.json(rows.map(r => ({
        id: r.id,
        recordRef: r.recordRef,
        collectionId: r.collectionId,
        provider: r.provider,
        providerId: r.providerId,
        created: r.created,
        updated: r.updated,
      })))
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName', authRouter)
}

function generateTOTPCode(secret: string, period = 30, digits = 6): string {
  const now = Math.floor(Date.now() / 1000)
  let timeStep = Math.floor(now / period)
  const counter = Buffer.alloc(8)
  for (let i = 7; i >= 0; i--) {
    counter[i] = timeStep & 0xff
    timeStep >>= 8
  }
  const hmac = createHmac('sha1', secret)
  hmac.update(counter)
  const hash = hmac.digest()
  const offset = hash[hash.length - 1] & 0x0f
  const binaryCode = ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  const code = binaryCode % Math.pow(10, digits)
  return code.toString().padStart(digits, '0')
}
