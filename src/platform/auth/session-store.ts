/**
 * Solarch CLI Session Store (Phase 2)
 *
 * Manages persisted machine-level session credentials at ~/.solarch/session.json
 * Enforces 0o600 file permissions and isolation from project-level manifests.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SessionCredentials } from './types.js'

export class SessionStore {
  private customConfigDir?: string

  constructor(customConfigDir?: string) {
    this.customConfigDir = customConfigDir
  }

  public getConfigDir(): string {
    if (this.customConfigDir) {
      return this.customConfigDir
    }
    if (process.env.SOLARCH_CONFIG_DIR) {
      return path.resolve(process.env.SOLARCH_CONFIG_DIR)
    }
    return path.join(os.homedir(), '.solarch')
  }

  public getSessionFilePath(): string {
    return path.join(this.getConfigDir(), 'session.json')
  }

  public async loadCredentials(): Promise<SessionCredentials | null> {
    const filePath = this.getSessionFilePath()
    try {
      if (!fs.existsSync(filePath)) {
        return null
      }
      const raw = await fs.promises.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.accessToken !== 'string') {
        return null
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : undefined,
        expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined,
        tokenType: typeof parsed.tokenType === 'string' ? parsed.tokenType : 'Bearer',
      }
    } catch {
      return null
    }
  }

  public async saveCredentials(credentials: SessionCredentials): Promise<void> {
    const configDir = this.getConfigDir()
    await fs.promises.mkdir(configDir, { recursive: true, mode: 0o700 })

    const filePath = this.getSessionFilePath()
    const payload = JSON.stringify(
      {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        tokenType: credentials.tokenType ?? 'Bearer',
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )

    // Write file with mode 0o600
    await fs.promises.writeFile(filePath, payload, { mode: 0o600, encoding: 'utf-8' })
    try {
      await fs.promises.chmod(filePath, 0o600)
    } catch {
      // Ignore chmod on unsupported file systems / Windows
    }
  }

  public async clearCredentials(): Promise<void> {
    const filePath = this.getSessionFilePath()
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
      }
    } catch {
      // Best-effort removal
    }
  }
}
