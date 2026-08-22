/**
 * Solarch CLI Base Snapshot Store (Phase 4)
 *
 * Persists the synchronization baseline at `.solarch/state/platform-base.json`
 * for true three-way merge reconciliation.
 */

import * as fs from 'fs'
import * as path from 'path'
import { PlatformProjectConfig } from '../schema/project-config.js'

export class BaseSnapshotStore {
  public static readonly STATE_DIR = '.solarch/state'
  public static readonly BASE_FILE = 'platform-base.json'

  public static getBasePath(projectDir: string = process.cwd()): string {
    return path.join(projectDir, this.STATE_DIR, this.BASE_FILE)
  }

  public static async getBase(projectDir: string = process.cwd()): Promise<PlatformProjectConfig | null> {
    const filePath = this.getBasePath(projectDir)
    if (!fs.existsSync(filePath)) {
      return null
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(content) as PlatformProjectConfig
    } catch {
      return null
    }
  }

  public static async saveBase(
    projectDir: string = process.cwd(),
    config: PlatformProjectConfig
  ): Promise<void> {
    const stateDir = path.join(projectDir, this.STATE_DIR)
    if (!fs.existsSync(stateDir)) {
      await fs.promises.mkdir(stateDir, { recursive: true })
    }
    const filePath = this.getBasePath(projectDir)
    await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  public static async clearBase(projectDir: string = process.cwd()): Promise<void> {
    const filePath = this.getBasePath(projectDir)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  }
}
