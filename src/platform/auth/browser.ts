/**
 * Solarch CLI Platform Auth Browser Helper (Phase 2)
 *
 * Launches system default web browser across macOS, Windows, and Linux
 * with zero external dependencies.
 */

import { exec } from 'child_process'
import os from 'os'

export async function openBrowser(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const platform = os.platform()
    let command = ''
    if (platform === 'darwin') {
      command = `open "${url}"`
    } else if (platform === 'win32') {
      command = `start "" "${url}"`
    } else {
      command = `xdg-open "${url}"`
    }

    exec(command, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
