/**
 * Filesystem watcher for Solarch development mode.
 * Monitors source code, migrations, and config files for changes, triggering graceful reboots.
 */

import fs from 'fs'
import path from 'path'

export interface DevWatcherOptions {
  cwd: string
  onChange: (file: string) => void | Promise<void>
}

export class DevWatcher {
  private watchers: fs.FSWatcher[] = []
  private debounceTimer: NodeJS.Timeout | null = null
  private cwd: string
  private onChange: (file: string) => void | Promise<void>
  private isClosed = false

  constructor(opts: DevWatcherOptions) {
    this.cwd = path.resolve(opts.cwd)
    this.onChange = opts.onChange
  }

  /**
   * Determine directories and files to monitor
   */
  public getWatchPaths(): string[] {
    const paths: string[] = []
    const candidates = ['src', 'pb_migrations']

    for (const c of candidates) {
      const full = path.join(this.cwd, c)
      if (fs.existsSync(full)) {
        paths.push(`${c}/`)
      }
    }

    const configs = ['solarch.config.ts', 'solarch.config.js', 'solarch.config.json']
    for (const cfg of configs) {
      if (fs.existsSync(path.join(this.cwd, cfg))) {
        paths.push(cfg)
      }
    }

    return paths
  }

  /**
   * Start watching files
   */
  public start(): void {
    if (this.isClosed) return

    const candidates = ['src', 'pb_migrations']

    for (const item of candidates) {
      const fullPath = path.join(this.cwd, item)
      if (fs.existsSync(fullPath)) {
        try {
          const watcher = fs.watch(fullPath, { recursive: true }, (_eventType, filename) => {
            if (filename) {
              this.handleFileChange(path.join(item, filename))
            }
          })
          this.watchers.push(watcher)
        } catch {
          // Fallback if recursive watch isn't supported
          try {
            const watcher = fs.watch(fullPath, (_eventType, filename) => {
              if (filename) {
                this.handleFileChange(path.join(item, filename))
              }
            })
            this.watchers.push(watcher)
          } catch {}
        }
      }
    }

    // Watch project root for config changes
    try {
      const rootWatcher = fs.watch(this.cwd, (_eventType, filename) => {
        if (!filename) return
        if (
          filename === 'solarch.config.ts' ||
          filename === 'solarch.config.js' ||
          filename === 'solarch.config.json'
        ) {
          this.handleFileChange(filename)
        }
      })
      this.watchers.push(rootWatcher)
    } catch {}
  }

  /**
   * Filter and debounce change events
   */
  private handleFileChange(relativeFile: string): void {
    if (this.isClosed) return

    // Ignore changes in non-watched directories
    const normalized = relativeFile.replace(/\\/g, '/')
    if (
      normalized.startsWith('pb_data') ||
      normalized.startsWith('.tmp') ||
      normalized.startsWith('logs') ||
      normalized.startsWith('coverage') ||
      normalized.startsWith('.git') ||
      normalized.startsWith('node_modules') ||
      normalized.includes('.env')
    ) {
      return
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      if (!this.isClosed) {
        this.onChange(relativeFile)
      }
    }, 200)
  }

  /**
   * Stop all active watchers
   */
  public close(): void {
    this.isClosed = true
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    for (const w of this.watchers) {
      try {
        w.close()
      } catch {}
    }
    this.watchers = []
  }
}
