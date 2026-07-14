import { BaseApp, BaseAppConfig } from './core/base'
import { serve } from './apis/serve'
import { BootstrapEvent } from './core/events'
import { hasSuperuser } from './cmd/superuser'
import { JSVM } from './tools/jsvm/jsvm'
import { MigrationRunner } from './core/migration'
import path from 'path'
import fs from 'fs'
import { once } from 'events'

// FIXED[L-4]: Read version from package.json at runtime
function loadVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export interface SolarchConfig {
  hideStartBanner?: boolean
  defaultDev?: boolean
  defaultDataDir?: string
  defaultEncryptionEnv?: string
  defaultQueryTimeout?: number
  dataMaxOpenConns?: number
  dataMaxIdleConns?: number
  auxMaxOpenConns?: number
  auxMaxIdleConns?: number
}

export class Solarch extends BaseApp {
  hideStartBanner: boolean
  version: string
  private _migrationRunner?: MigrationRunner

  constructor(config: SolarchConfig = {}) {
    const baseConfig: BaseAppConfig = {
      isDev: config.defaultDev ?? false,
      dataDir: config.defaultDataDir ?? './pb_data',
      encryptionEnv: config.defaultEncryptionEnv,
      queryTimeout: config.defaultQueryTimeout,
      dataMaxOpenConns: config.dataMaxOpenConns,
      dataMaxIdleConns: config.dataMaxIdleConns,
      auxMaxOpenConns: config.auxMaxOpenConns,
      auxMaxIdleConns: config.auxMaxIdleConns,
    }
    super(baseConfig)
    this.hideStartBanner = config.hideStartBanner ?? false
    // FIXED[L-4]: Load version from package.json instead of hardcoding
    this.version = loadVersion()
    this._migrationRunner = undefined
  }

  async start(port = 8090): Promise<void> {
    await this.bootstrap()
    await this.migrate()
    await this.loadJSHooks()

    const hasAdmin = hasSuperuser(this)
    const installerUrl = `http://localhost:${port}/_/#/install`

    if (!this.hideStartBanner) {
      console.log(`
Solarch v${this.version}
Server started at http://localhost:${port}
- REST API: http://localhost:${port}/api/
- Admin UI: http://localhost:${port}/_/
`)
      if (!hasAdmin) {
        console.log(`
========================================
  NO SUPERUSER FOUND
  Complete installation at:
  ${installerUrl}
  
  Or run: ./solarch superuser-create EMAIL PASS
========================================
`)
      }
    }

    const httpServer = await serve(this, port)

    // FIXED[M-3]: Periodic cleanup of expired auth tokens
    const cleanupAuthTokens = async () => {
      try {
        const { deleteExpiredOTPs, deleteExpiredMFAs } = await import('./core/auth_queries.js')
        await deleteExpiredOTPs(this)
        await deleteExpiredMFAs(this)
        const db = this.db().getDataDB()
        const now = new Date().toISOString()
        db.prepare(`DELETE FROM _passwordResetTokens WHERE expiresAt < ?`).run(now)
        db.prepare(`DELETE FROM _oauth2States WHERE expiresAt < ?`).run(now)
      } catch {}
    }
    // Run immediately on start, then every 30 minutes
    cleanupAuthTokens()
    const cleanupInterval = setInterval(cleanupAuthTokens, 30 * 60 * 1000)

    // FIXED[L-2]: Await HTTP server drain with forced timeout
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`)
      clearInterval(cleanupInterval)
      const forceExit = setTimeout(() => process.exit(1), 10000)
      await new Promise<void>(resolve => httpServer.close(() => resolve()))
      clearTimeout(forceExit)
      try { this.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)') } catch {}
      try { this.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)') } catch {}
      this.db().close()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGHUP', () => shutdown('SIGHUP'))
  }

  async migrate(): Promise<void> {
    if (!this._migrationRunner) {
      this._migrationRunner = new MigrationRunner(this)
      this._loadJSMigrations()
    }
    await this._migrationRunner.run()
  }

  async migrateDown(count = 1): Promise<void> {
    if (!this._migrationRunner) {
      this._migrationRunner = new MigrationRunner(this)
      this._loadJSMigrations()
    }
    await this._migrationRunner.rollback(count)
  }

  migrationStatus(): { id: string; applied: boolean; appliedAt?: string }[] {
    if (!this._migrationRunner) {
      this._migrationRunner = new MigrationRunner(this)
      this._loadJSMigrations()
    }
    return this._migrationRunner.status()
  }

  private _loadJSMigrations(): void {
    const migrationsDir = path.join(process.cwd(), 'pb_migrations')
    if (!fs.existsSync(migrationsDir)) return

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort()

    for (const file of files) {
      const migrationId = file.replace(/\.js$/, '')
      const fullPath = path.join(migrationsDir, file)

      try {
        // Clear require cache to allow reloading
        delete require.cache[require.resolve(fullPath)]
        const mod = require(fullPath)

        this._migrationRunner!.add({
          id: migrationId,
          up: mod.up,
          down: mod.down,
        })
      } catch (err: any) {
        console.error(`Failed to load migration ${file}:`, err.message)
      }
    }
  }

  private async loadJSHooks(): Promise<void> {
    const jsvm = new JSVM(this)
    await jsvm.loadHooks()
  }
}

export function newSolarch(config?: SolarchConfig): Solarch {
  return new Solarch(config)
}
