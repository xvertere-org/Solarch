import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { SettingsEncryption } from '../core/settings_encrypt'
import { Mailer } from '../tools/mailer/mailer'
import { EmailTemplateEngine, sendVerificationEmail } from '../tools/mailer/templates'
import { AppSettings } from '../core/settings'
import { Filesystem } from '../tools/filesystem/filesystem'

const SETTINGS_WRITABLE_KEYS = new Set([
  'appName', 'appNameVisible', 'appURL', 'jwtSecret', 'hideControls',
  'senderName', 'senderAddress', 'metaTitle', 'metaDescription', 'metaKeywords',
  'metaImageURL', 'metaRobots', 'logsMaxDays', 'backups', 'smtp', 's3',
  'tokenAuth', 'rateLimits', 'batch', 'ai',
])

export const MASKED_PLACEHOLDER = '********'

function maskSecret(val: string | undefined): string {
  if (!val) return ''
  return MASKED_PLACEHOLDER
}

export function getSafeSettings(settings: AppSettings): Record<string, any> {
  return {
    appName: settings.appName,
    appNameVisible: settings.appNameVisible,
    appURL: settings.appURL,
    jwtSecret: maskSecret(settings.jwtSecret),
    hideControls: settings.hideControls,
    senderName: settings.senderName,
    senderAddress: settings.senderAddress,
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    metaKeywords: settings.metaKeywords,
    metaImageURL: settings.metaImageURL,
    metaRobots: settings.metaRobots,
    logsMaxDays: settings.logsMaxDays,
    backups: { ...settings.backups },
    smtp: {
      ...settings.smtp,
      password: maskSecret(settings.smtp?.password),
    },
    s3: {
      ...settings.s3,
      secret: maskSecret(settings.s3?.secret),
    },
    tokenAuth: { ...settings.tokenAuth },
    rateLimits: { ...settings.rateLimits },
    batch: { ...settings.batch },
    ai: {
      ...settings.ai,
      apiKey: maskSecret(settings.ai?.apiKey),
    },
  }
}

export function mergeIncomingSettings(original: AppSettings, incoming: any): AppSettings {
  if (!incoming || typeof incoming !== 'object') return original

  const merged = { ...original }
  
  if (typeof incoming.appName === 'string') merged.appName = incoming.appName
  if (typeof incoming.appNameVisible === 'boolean') merged.appNameVisible = incoming.appNameVisible
  if (typeof incoming.appURL === 'string') merged.appURL = incoming.appURL
  if (typeof incoming.jwtSecret === 'string' && incoming.jwtSecret !== MASKED_PLACEHOLDER) merged.jwtSecret = incoming.jwtSecret
  if (typeof incoming.hideControls === 'boolean') merged.hideControls = incoming.hideControls
  if (typeof incoming.senderName === 'string') merged.senderName = incoming.senderName
  if (typeof incoming.senderAddress === 'string') merged.senderAddress = incoming.senderAddress
  if (typeof incoming.metaTitle === 'string') merged.metaTitle = incoming.metaTitle
  if (typeof incoming.metaDescription === 'string') merged.metaDescription = incoming.metaDescription
  if (typeof incoming.metaKeywords === 'string') merged.metaKeywords = incoming.metaKeywords
  if (typeof incoming.metaImageURL === 'string') merged.metaImageURL = incoming.metaImageURL
  if (typeof incoming.metaRobots === 'string') merged.metaRobots = incoming.metaRobots
  if (typeof incoming.logsMaxDays === 'number') merged.logsMaxDays = incoming.logsMaxDays
  
  if (incoming.backups && typeof incoming.backups === 'object') {
    merged.backups = { ...merged.backups }
    if (typeof incoming.backups.cron === 'string') merged.backups.cron = incoming.backups.cron
    if (typeof incoming.backups.cronMaxKeep === 'number') merged.backups.cronMaxKeep = incoming.backups.cronMaxKeep
  }
  
  if (incoming.smtp && typeof incoming.smtp === 'object') {
    merged.smtp = { ...merged.smtp }
    if (typeof incoming.smtp.host === 'string') merged.smtp.host = incoming.smtp.host
    if (typeof incoming.smtp.port === 'number') merged.smtp.port = incoming.smtp.port
    if (typeof incoming.smtp.username === 'string') merged.smtp.username = incoming.smtp.username
    if (typeof incoming.smtp.authMethod === 'string') merged.smtp.authMethod = incoming.smtp.authMethod
    if (typeof incoming.smtp.tls === 'boolean') merged.smtp.tls = incoming.smtp.tls
    if (typeof incoming.smtp.localName === 'string') merged.smtp.localName = incoming.smtp.localName
    
    if (typeof incoming.smtp.password === 'string') {
      if (incoming.smtp.password !== MASKED_PLACEHOLDER) {
        merged.smtp.password = incoming.smtp.password
      }
    }
  }
  
  if (incoming.s3 && typeof incoming.s3 === 'object') {
    merged.s3 = { ...merged.s3 }
    if (typeof incoming.s3.enabled === 'boolean') merged.s3.enabled = incoming.s3.enabled
    if (typeof incoming.s3.bucket === 'string') merged.s3.bucket = incoming.s3.bucket
    if (typeof incoming.s3.region === 'string') merged.s3.region = incoming.s3.region
    if (typeof incoming.s3.endpoint === 'string') merged.s3.endpoint = incoming.s3.endpoint
    if (typeof incoming.s3.accessKey === 'string') merged.s3.accessKey = incoming.s3.accessKey
    if (typeof incoming.s3.forcePathStyle === 'boolean') merged.s3.forcePathStyle = incoming.s3.forcePathStyle
    if (typeof incoming.s3.prefix === 'string') merged.s3.prefix = incoming.s3.prefix
    
    if (typeof incoming.s3.secret === 'string') {
      if (incoming.s3.secret !== MASKED_PLACEHOLDER) {
        merged.s3.secret = incoming.s3.secret
      }
    }
  }
  
  if (incoming.tokenAuth && typeof incoming.tokenAuth === 'object') {
    merged.tokenAuth = { ...merged.tokenAuth }
    if (typeof incoming.tokenAuth.enabled === 'boolean') merged.tokenAuth.enabled = incoming.tokenAuth.enabled
  }
  
  if (incoming.rateLimits && typeof incoming.rateLimits === 'object') {
    merged.rateLimits = { ...merged.rateLimits }
    if (typeof incoming.rateLimits.enabled === 'boolean') merged.rateLimits.enabled = incoming.rateLimits.enabled
    if (Array.isArray(incoming.rateLimits.rules)) {
      merged.rateLimits.rules = incoming.rateLimits.rules.filter((r: any) => typeof r.duration === 'number' && typeof r.requests === 'number')
    }
  }
  
  if (incoming.batch && typeof incoming.batch === 'object') {
    merged.batch = { ...merged.batch }
    if (typeof incoming.batch.enabled === 'boolean') merged.batch.enabled = incoming.batch.enabled
    if (typeof incoming.batch.maxBatchSize === 'number') merged.batch.maxBatchSize = incoming.batch.maxBatchSize
  }
  
  if (incoming.ai && typeof incoming.ai === 'object') {
    merged.ai = { ...merged.ai }
    if (typeof incoming.ai.enabled === 'boolean') merged.ai.enabled = incoming.ai.enabled
    if (typeof incoming.ai.provider === 'string') merged.ai.provider = incoming.ai.provider
    if (typeof incoming.ai.model === 'string') merged.ai.model = incoming.ai.model
    if (typeof incoming.ai.baseURL === 'string') merged.ai.baseURL = incoming.ai.baseURL
    if (typeof incoming.ai.temperature === 'number') merged.ai.temperature = incoming.ai.temperature
    if (typeof incoming.ai.maxTokens === 'number') merged.ai.maxTokens = incoming.ai.maxTokens
    
    if (typeof incoming.ai.apiKey === 'string') {
      if (incoming.ai.apiKey !== MASKED_PLACEHOLDER) {
        merged.ai.apiKey = incoming.ai.apiKey
      }
    }
  }
  
  return merged
}

export function registerSettingsRoutes(app: BaseApp, router: Router): void {
  const settingsRouter = Router()
  const encryption = new SettingsEncryption(app)

  settingsRouter.get('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const settings = app.settings()
      res.json(getSafeSettings(settings))
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  settingsRouter.patch('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      // Pick keys to ensure no garbage fields
      const picked: Record<string, any> = {}
      for (const key of Object.keys(req.body)) {
        if (SETTINGS_WRITABLE_KEYS.has(key)) {
          picked[key] = req.body[key]
        }
      }
      
      let settings = mergeIncomingSettings(app.settings(), picked)

      // Encrypt sensitive fields before saving
      settings = await encryption.encryptSettings(settings) as any

      const now = new Date().toISOString()
      await app.db().execute("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'", [JSON.stringify(settings), now])
      await app.reloadSettings()
      res.json(getSafeSettings(app.settings()))
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  settingsRouter.post('/test/email', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { to, config } = req.body
      let settings = app.settings()
      
      if (config) {
        settings = mergeIncomingSettings(settings, config)
      }

      if (!settings.smtp.host) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'SMTP not configured.'))
      }

      const mailer = Mailer.fromSettings(settings)
      const engine = new EmailTemplateEngine(settings)

      await sendVerificationEmail(mailer, engine, to, {
        verificationURL: `${settings.appURL}/_/#/auth/verify/test`,
      })

      res.json({ success: true, message: `Test email sent to ${to}.` })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  settingsRouter.post('/test/s3', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { config } = req.body
      let settings = app.settings()
      
      if (config) {
        settings = mergeIncomingSettings(settings, config)
      }

      if (!settings.s3.enabled) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'S3 not enabled.'))
      }
      
      const fsys = new Filesystem({
        dataDir: app.dataDir,
        s3Config: settings.s3,
      })
      
      const testKey = `_solarch_test_${Date.now()}`
      await fsys.putFile(testKey, 'ok')
      const exists = await fsys.fileExists(testKey)
      await fsys.deleteFile(testKey)
      if (!exists) {
        return res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'S3 write/read test failed.'))
      }
      res.json({ success: true, message: 'S3 connection successful.' })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'S3 connection failed.'))
    }
  })

  router.use('/api/settings', settingsRouter)
}
