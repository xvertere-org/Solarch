/**
 * Solarch Development Server Lifecycle Runner.
 * Coordinates preflight validation, HTTP server startup, file watching, hotkeys, and graceful shutdown.
 */

import path from 'path'
import http from 'http'
import { DevOptions, DevState } from './types.js'
import { DevWatcher } from './watcher.js'
import { DevControls } from './controls.js'
import { formatDevBanner, formatRestartBanner, formatLogs } from './formatter.js'
import { Solarch } from '../../solarch.js'
import { serve } from '../../apis/serve.js'
import { runDoctor } from '../doctor.js'
import { resolveEffectiveConfig } from '../config/resolver.js'
import { colors } from '../../ui/theme.js'

export class DevRunner {
  private opts: DevOptions
  private cwd: string
  private state: DevState
  private watcher?: DevWatcher
  private controls?: DevControls
  private recentLogs: string[] = []
  private isShuttingDown = false
  private signalHandlers: { event: NodeJS.Signals; handler: () => void }[] = []

  constructor(opts: DevOptions = {}) {
    this.opts = opts
    this.cwd = path.resolve(opts.dir || '.')

    let port = opts.port
      ? (typeof opts.port === 'string' ? parseInt(opts.port, 10) : opts.port)
      : 8090

    try {
      const { report: cfgReport } = resolveEffectiveConfig({ dir: this.cwd })
      if (!opts.port && cfgReport.runtime.port) {
        port = cfgReport.runtime.port
      }
    } catch {}

    this.state = {
      port,
      cwd: this.cwd,
      watching: opts.watch !== false,
      isRunning: false,
      watchPaths: [],
    }
  }

  public getState(): DevState {
    return { ...this.state }
  }

  /**
   * Run preflight doctor checks before booting the server
   */
  public async preflight(): Promise<boolean> {
    const doctorReport = await runDoctor({
      cwd: this.cwd,
      silent: true,
      exitOnComplete: false,
    })

    const hasFatal = doctorReport.checks.some(c => c.status === 'fail')
    if (hasFatal) {
      console.error(`\n${colors.bold(colors.red('✖ Preflight diagnostics failed:'))}\n`)
      for (const check of doctorReport.checks.filter(c => c.status === 'fail')) {
        console.error(`  ${colors.red('✖')} ${colors.bold(check.name)}: ${check.message}`)
      }
      console.error(`\n${colors.yellow('Please fix the above issues before starting the development server.\n')}`)
      return false
    }

    return true
  }

  /**
   * Start the development server lifecycle
   */
  public async start(): Promise<void> {
    // 1. Run Preflight Diagnostics
    const preflightPassed = await this.preflight()
    if (!preflightPassed) {
      if (this.opts.exitOnComplete ?? true) {
        process.exit(1)
      }
      throw new Error('Preflight validation failed')
    }

    // 2. Start Server Instance
    await this.bootServer()

    // 3. Initialize Watcher (if enabled)
    if (this.state.watching) {
      this.watcher = new DevWatcher({
        cwd: this.cwd,
        onChange: async (changedFile) => {
          await this.restart(`file changed: ${changedFile}`)
        },
      })
      this.state.watchPaths = this.watcher.getWatchPaths()
      this.watcher.start()
    }

    // 4. Format & Display Startup Banner
    formatDevBanner({
      port: this.state.port,
      mode: 'development',
      watchPaths: this.state.watchPaths,
      isWatching: this.state.watching,
    })

    // 5. Initialize Keyboard Controls
    this.controls = new DevControls({
      onRestart: async () => {
        await this.restart('manual hotkey')
      },
      onLogs: async () => {
        formatLogs(this.recentLogs)
      },
      onDoctor: async () => {
        await runDoctor({ cwd: this.cwd, silent: false, exitOnComplete: false })
      },
      onQuit: async () => {
        await this.stop()
        if (this.opts.exitOnComplete ?? true) {
          process.exit(0)
        }
      },
    })
    this.controls.start()

    // 6. Register Signal Handlers
    const onSig = async () => {
      await this.stop()
      if (this.opts.exitOnComplete ?? true) {
        process.exit(0)
      }
    }

    process.on('SIGINT', onSig)
    process.on('SIGTERM', onSig)
    this.signalHandlers.push({ event: 'SIGINT', handler: onSig })
    this.signalHandlers.push({ event: 'SIGTERM', handler: onSig })

    this.state.isRunning = true
  }

  /**
   * Boot or reboot the internal Solarch server instance
   */
  private async bootServer(): Promise<void> {
    const app = new Solarch({
      isDev: true,
      defaultDev: true,
      hideStartBanner: true,
    })

    await app.bootstrap()
    await app.migrate()
    try {
      await (app as any).loadJSHooks()
    } catch {}

    const httpServer = await serve(app, this.state.port)
    this.state.app = app
    this.state.server = httpServer
  }

  /**
   * Gracefully restart the server instance
   */
  public async restart(reason?: string): Promise<void> {
    if (this.isShuttingDown) return

    formatRestartBanner(reason)

    try {
      // 1. Close active HTTP server
      if (this.state.server) {
        await new Promise<void>((resolve) => {
          this.state.server!.close(() => resolve())
        })
        this.state.server = undefined
      }

      // 2. Checkpoint & close database
      if (this.state.app) {
        try { await this.state.app.db().checkpoint('data') } catch {}
        try { await this.state.app.db().checkpoint('aux') } catch {}
        try { await this.state.app.db().close() } catch {}
        this.state.app = undefined
      }

      // 3. Boot fresh instance
      await this.bootServer()
      console.log(`${colors.green('✔')} Development server rebooted on port ${this.state.port}\n`)
    } catch (err: any) {
      console.error(`${colors.red('✖')} Failed to restart server: ${err.message}\n`)
    }
  }

  /**
   * Gracefully stop the development server and all watchers
   */
  public async stop(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    console.log(`\n${colors.dim('Shutting down Solarch development server...')}`)

    if (this.controls) {
      this.controls.close()
      this.controls = undefined
    }

    if (this.watcher) {
      this.watcher.close()
      this.watcher = undefined
    }

    for (const sh of this.signalHandlers) {
      process.removeListener(sh.event, sh.handler)
    }
    this.signalHandlers = []

    if (this.state.server) {
      await new Promise<void>((resolve) => {
        this.state.server!.close(() => resolve())
      })
      this.state.server = undefined
    }

    if (this.state.app) {
      try { await this.state.app.db().checkpoint('data') } catch {}
      try { await this.state.app.db().checkpoint('aux') } catch {}
      try { await this.state.app.db().close() } catch {}
      this.state.app = undefined
    }

    this.state.isRunning = false
    console.log(`${colors.green('✔')} Development server stopped cleanly.\n`)
  }
}
