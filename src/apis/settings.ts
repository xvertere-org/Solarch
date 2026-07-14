import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { SettingsEncryption } from '../core/settings_encrypt'
import { Mailer } from '../tools/mailer/mailer'
import { EmailTemplateEngine, sendVerificationEmail } from '../tools/mailer/templates'

const SETTINGS_WRITABLE_KEYS = new Set([
  'appName', 'appNameVisible', 'appURL', 'jwtSecret', 'hideControls',
  'senderName', 'senderAddress', 'metaTitle', 'metaDescription', 'metaKeywords',
  'metaImageURL', 'metaRobots', 'logsMaxDays', 'backups', 'smtp', 's3',
  'tokenAuth', 'rateLimits', 'batch', 'ai',
])

function pickSettingsKeys(body: Record<string, any>): Record<string, any> {
  const picked: Record<string, any> = {}
  for (const key of Object.keys(body)) {
    if (SETTINGS_WRITABLE_KEYS.has(key)) {
      picked[key] = body[key]
    }
  }
  return picked
}

export function registerSettingsRoutes(app: BaseApp, router: Router): void {
  const settingsRouter = Router()
  const encryption = new SettingsEncryption(app)

  settingsRouter.get('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const settings = app.settings()
      res.json(settings)
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  settingsRouter.patch('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const picked = pickSettingsKeys(req.body)
      let settings = { ...app.settings(), ...picked as any }

      // Encrypt sensitive fields before saving
      // FIXED[H-2]: Await async encryptSettings
      settings = await encryption.encryptSettings(settings)

      const db = app.db().getDataDB()
      const now = new Date().toISOString()
      db.prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
        JSON.stringify(settings), now
      )
      await app.reloadSettings()
      res.json(app.settings())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  settingsRouter.post('/test/email', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { to } = req.body
      const settings = app.settings()

      if (!settings.smtp.host) {
        return res.status(400).json({ code: 400, message: 'SMTP not configured.' })
      }

      const mailer = Mailer.fromSettings(settings)
      const engine = new EmailTemplateEngine(settings)

      await sendVerificationEmail(mailer, engine, to, {
        verificationURL: `${settings.appURL}/_/#/auth/verify/test`,
      })

      res.json({ success: true, message: `Test email sent to ${to}.` })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  settingsRouter.post('/test/s3', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const settings = app.settings()
      if (!settings.s3.enabled) {
        return res.status(400).json({ code: 400, message: 'S3 not enabled.' })
      }
      const fsys = app.getFilesystem()
      const testKey = `_solarch_test_${Date.now()}`
      await fsys.putFile(testKey, 'ok')
      const exists = await fsys.fileExists(testKey)
      await fsys.deleteFile(testKey)
      if (!exists) {
        return res.status(500).json({ code: 500, message: 'S3 write/read test failed.' })
      }
      res.json({ success: true, message: 'S3 connection successful.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'S3 connection failed.' })
    }
  })

  router.use('/api/settings', settingsRouter)
}
