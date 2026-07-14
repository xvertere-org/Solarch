import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { BaseApp } from '../core/base'
import { registerAuthRoutes } from './record_auth'
import { registerRecordCRUDRoutes } from './record_crud'
import { registerCollectionRoutes } from './collection'
import { registerSettingsRoutes } from './settings'
import { registerHealthRoutes } from './health'
import { registerRealtimeRoutes, setupWebSocketRealtime } from './realtime'
import { registerFileRoutes } from './file'
import { registerBatchRoutes } from './batch'
import { registerCronRoutes } from './cron'
import { registerBackupRoutes } from './backup'
import { registerLogRoutes } from './logs'
import { registerInstallerRoutes } from './installer'
import { registerAIRoutes } from './ai'
import { registerAgentRoutes } from './agent'
import { registerAdminAuthRoutes } from './admin_auth'
import { corsMiddleware } from './middlewares_cors'
import { gzipMiddleware } from './middlewares_gzip'
import { rateLimitMiddleware } from './middlewares_rate_limit'
import { bodyLimitMiddleware } from './middlewares_body_limit'
import { loadAuthToken } from './middlewares_auth'
import { registerPasswordResetRoutes, registerVerificationRoutes, registerEmailChangeRoutes, registerImpersonateRoutes } from './auth_flows'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { registerBuiltInProviders } from '../tools/auth/oauth2'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { hasSuperuser } from '../cmd/superuser'

export async function serve(app: BaseApp, port: number): Promise<http.Server> {
  // Register built-in OAuth2 providers
  registerBuiltInProviders()

  const server = express()

  server.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hidePoweredBy: true,
  }))
  server.use(corsMiddleware())
  server.use(require('morgan')((tokens: any, req: any, res: any) => {
    const url = tokens.url(req, res) || ''
    const pathOnly = url.split('?')[0]
    return [
      tokens.method(req, res),
      pathOnly,
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'),
      '-',
      tokens['response-time'](req, res),
      'ms',
    ].join(' ')
  }))

  server.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    next()
  })

  server.use(express.json({ limit: '10mb' }))
  server.use(express.urlencoded({ extended: true, limit: '10mb' }))
  server.use(rateLimitMiddleware(app))
  server.use(bodyLimitMiddleware())
  server.use(loadAuthToken(app))
  const publicDir = path.join(process.cwd(), 'pb_public')
  if (fs.existsSync(publicDir)) {
    server.use(express.static(publicDir))
  }

  registerHealthRoutes(app, server)
  registerInstallerRoutes(app, server)
  registerAdminAuthRoutes(app, server)
  registerAuthRoutes(app, server)
  registerPasswordResetRoutes(app, server)
  registerVerificationRoutes(app, server)
  registerEmailChangeRoutes(app, server)
  registerImpersonateRoutes(app, server)
  registerRecordCRUDRoutes(app, server)
  registerCollectionRoutes(app, server)
  registerSettingsRoutes(app, server)
  registerRealtimeRoutes(app, server)
  registerFileRoutes(app, server)
  registerBatchRoutes(app, server)
  registerCronRoutes(app, server)
  registerBackupRoutes(app, server)
  registerLogRoutes(app, server)
  registerAIRoutes(app, server)
  registerAgentRoutes(app, server)

  const adminBuildDir = path.join(process.cwd(), 'pb_public', 'admin')
  if (fs.existsSync(adminBuildDir)) {
    server.use('/_/', express.static(adminBuildDir))
    server.get('/_/*', (req, res) => {
      res.sendFile(path.join(adminBuildDir, 'index.html'))
    })
  } else {
    server.get('/_/', (req, res) => {
      const installerUrl = `http://localhost:${port}/api/installer`
      const hasAdmin = hasSuperuser(app)
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TspoonBase Admin</title>
            <meta charset="utf-8">
            <style>
              body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              h1 { color: #333; }
              .box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              a { color: #0066cc; }
              code { background: #eee; padding: 2px 6px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>TspoonBase Admin</h1>
            ${hasAdmin ? `
              <div class="box">
                <p>Admin UI is not built yet.</p>
                <p>Run <code>cd admin && npm install && npm run build</code> to build the Admin UI.</p>
                <p>Or manage your data using the REST API at <code>/api/</code></p>
              </div>
            ` : `
              <div class="box">
                <p>No superuser found. Please complete the installation:</p>
                <p><a href="${installerUrl}">Open Installer</a></p>
                <p>Or run: <code>./tspoonbase superuser-create EMAIL PASS</code></p>
              </div>
            `}
          </body>
        </html>
      `)
    })
  }

  await app.onServe.trigger({ app, router: server })
  try {
    const backupCron = app.settings().backups?.cron
    const maxKeep = app.settings().backups?.cronMaxKeep ?? 3
    if (backupCron) {
      const croner = require('croner')
      croner(backupCron, async () => {
        try {
          const { createStreamingBackup, isBackupInProgress } = await import('./backup_utils.js')
          if (isBackupInProgress()) {
            app.logger().warn('Skipping automated backup — another backup is already in progress')
            return
          }
          const backupDir = path.join(app.dataDir, 'backups')
          await fsPromises.mkdir(backupDir, { recursive: true })
          const backupName = `auto_backup_${Date.now()}.zip`
          const backupPath = path.join(backupDir, backupName)
          await createStreamingBackup(app, backupPath)
          const allFiles = await fsPromises.readdir(backupDir)
          const zipFiles = allFiles
            .filter(f => f.startsWith('auto_backup_') && f.endsWith('.zip'))
            .sort()
          while (zipFiles.length > maxKeep) {
            const old = zipFiles.shift()
            if (old) await fsPromises.unlink(path.join(backupDir, old))
          }
        } catch (err: any) {
          app.logger().error('Automated backup failed', err.message)
        }
      })
    }
  } catch { }

  const httpServer = http.createServer(server)

  const wss = new WebSocketServer({ noServer: true })
  setupWebSocketRealtime(wss, app)

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/api/realtime')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  httpServer.listen(port, () => {
    if (!app.isDev) {
      console.log(`Server listening on port ${port}`)
    }
  })

  return httpServer
}
