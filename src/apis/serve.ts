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
import { hasSuperuser } from '../cmd/superuser'

export async function serve(app: BaseApp, port: number): Promise<http.Server> {
  // Register built-in OAuth2 providers
  registerBuiltInProviders()

  const server = express()

  server.use(helmet({ contentSecurityPolicy: false }))
  server.use(corsMiddleware())
  server.use(require('morgan')('dev'))
  server.use(express.json({ limit: '50mb' }))
  server.use(express.urlencoded({ extended: true, limit: '50mb' }))
  // server.use(gzipMiddleware())
  server.use(rateLimitMiddleware(app))
  server.use(bodyLimitMiddleware())
  server.use(loadAuthToken(app))

  // Serve static files from pb_public directory if it exists
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

  // Serve built Admin UI from pb_public/admin if available
  const adminBuildDir = path.join(process.cwd(), 'pb_public', 'admin')
  if (fs.existsSync(adminBuildDir)) {
    server.use('/_/', express.static(adminBuildDir))
    server.get('/_/*', (req, res) => {
      res.sendFile(path.join(adminBuildDir, 'index.html'))
    })
  } else {
    // Fallback placeholder when admin UI is not built
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

  // Schedule automated backups if configured
  try {
    const backupCron = app.settings().backups?.cron
    const maxKeep = app.settings().backups?.cronMaxKeep ?? 3
    if (backupCron) {
      const croner = require('croner')
      croner(backupCron, async () => {
        try {
          const { default: JSZip } = await import('jszip')
          const backupDir = path.join(app.dataDir, 'backups')
          fs.mkdirSync(backupDir, { recursive: true })
          const backupName = `auto_backup_${Date.now()}.zip`
          const backupPath = path.join(backupDir, backupName)

          const zip = new JSZip()
          for (const dbFile of ['data.db', 'auxiliary.db']) {
            const dbPath = path.join(app.dataDir, dbFile)
            if (fs.existsSync(dbPath)) {
              zip.file(dbFile, fs.readFileSync(dbPath))
            }
          }
          const storageDir = path.join(app.dataDir, 'storage')
          if (fs.existsSync(storageDir)) {
            const walk = (dir: string, prefix: string) => {
              for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const fp = path.join(dir, e.name)
                if (e.isDirectory()) walk(fp, prefix ? `${prefix}/${e.name}` : e.name)
                else zip.file(`storage/${prefix ? prefix + '/' : ''}${e.name}`, fs.readFileSync(fp))
              }
            }
            walk(storageDir, '')
          }
          const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
          fs.writeFileSync(backupPath, buf)

          // Prune old backups
          const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('auto_backup_') && f.endsWith('.zip'))
            .sort()
          while (files.length > maxKeep) {
            const old = files.shift()
            if (old) fs.unlinkSync(path.join(backupDir, old))
          }
        } catch (err: any) {
          app.logger().error('Automated backup failed', err.message)
        }
      })
    }
  } catch {}

  const httpServer = http.createServer(server)

  const wss = new WebSocketServer({ noServer: true })
  setupWebSocketRealtime(wss)

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/realtime') {
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
