/**
 * Interactive Keyboard Controls for Solarch Development Server.
 * Supports hotkeys: 'r' (restart), 'l' (logs), 'd' (doctor), 'q' (quit).
 */

import readline from 'readline'

export interface DevControlsHandler {
  onRestart: () => void | Promise<void>
  onLogs: () => void | Promise<void>
  onDoctor: () => void | Promise<void>
  onQuit: () => void | Promise<void>
}

export class DevControls {
  private handler: DevControlsHandler
  private isRaw = false
  private isClosed = false
  private onKeyPressListener: ((str: string, key: readline.Key) => void) | null = null

  constructor(handler: DevControlsHandler) {
    this.handler = handler
  }

  public start(): void {
    if (this.isClosed || !process.stdin.isTTY) return

    readline.emitKeypressEvents(process.stdin)
    try {
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true)
        this.isRaw = true
      }
    } catch {}

    this.onKeyPressListener = async (_str: string, key: readline.Key) => {
      if (this.isClosed) return

      if (key.ctrl && key.name === 'c') {
        await this.handler.onQuit()
        return
      }

      switch (key.name) {
        case 'r':
          await this.handler.onRestart()
          break
        case 'l':
          await this.handler.onLogs()
          break
        case 'd':
          await this.handler.onDoctor()
          break
        case 'q':
          await this.handler.onQuit()
          break
      }
    }

    process.stdin.on('keypress', this.onKeyPressListener)
    process.stdin.resume()
  }

  public close(): void {
    this.isClosed = true
    if (this.onKeyPressListener) {
      process.stdin.removeListener('keypress', this.onKeyPressListener)
      this.onKeyPressListener = null
    }

    if (this.isRaw && process.stdin.isTTY) {
      try {
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(false)
        }
      } catch {}
      this.isRaw = false
    }

    process.stdin.pause()
  }
}
