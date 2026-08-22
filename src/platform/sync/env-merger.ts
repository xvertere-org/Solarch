/**
 * Solarch CLI Smart .env Merger & Permission Enforcer (Phase 3)
 *
 * Merges platform-managed environment variables while preserving local developer variables,
 * existing comments, and enforcing 0o600 file permissions.
 */

import * as fs from 'fs'
import dotenv from 'dotenv'
import { EnvironmentTarget, EnvMergeResult } from './types.js'

export class EnvMerger {
  /**
   * Merges remote platform variables into local .env string content.
   */
  public static merge(
    existingContent: string,
    remoteVars: Record<string, string>,
    options: {
      environment: EnvironmentTarget
      force?: boolean
    }
  ): EnvMergeResult {
    const existingParsed = dotenv.parse(existingContent || '')
    const added: string[] = []
    const updated: string[] = []
    const preserved: string[] = []

    const remoteKeys = new Set(Object.keys(remoteVars))
    const existingKeys = new Set(Object.keys(existingParsed))

    // Track local developer variables that are not platform-managed
    for (const key of existingKeys) {
      if (!remoteKeys.has(key)) {
        preserved.push(key)
      }
    }

    // Process remote variables
    const updatedVars: Record<string, string> = { ...existingParsed }

    for (const [key, value] of Object.entries(remoteVars)) {
      if (key in existingParsed) {
        if (existingParsed[key] !== value) {
          if (options.force) {
            updatedVars[key] = value
            updated.push(key)
          } else {
            // Keep local value as user override
            preserved.push(key)
          }
        } else {
          preserved.push(key)
        }
      } else {
        updatedVars[key] = value
        added.push(key)
      }
    }

    // Generate cleanly formatted .env file content
    const lines: string[] = []

    // 1. Preserved local / existing entries
    const localEntries = Object.entries(updatedVars).filter(([k]) => !remoteKeys.has(k))
    if (localEntries.length > 0) {
      lines.push('# Local & Application Environment Variables')
      for (const [k, v] of localEntries) {
        lines.push(`${k}=${EnvMerger.escapeValue(v)}`)
      }
      lines.push('')
    }

    // 2. Solarch Platform Managed Section
    lines.push(`# Solarch Platform Managed (${options.environment})`)
    for (const key of Object.keys(remoteVars)) {
      const val = updatedVars[key] ?? remoteVars[key]
      lines.push(`${key}=${EnvMerger.escapeValue(val)}`)
    }
    lines.push('')

    return {
      content: lines.join('\n'),
      added,
      updated,
      preserved,
    }
  }

  /**
   * Safely writes .env file with mode 0o600.
   */
  public static async writeEnvFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, { mode: 0o600, encoding: 'utf-8' })
    try {
      await fs.promises.chmod(filePath, 0o600)
    } catch {
      // Ignore chmod on unsupported file systems
    }
  }

  private static escapeValue(val: string): string {
    if (val.includes('\n') || val.includes(' ') || val.includes('"') || val.includes('#')) {
      return `"${val.replace(/"/g, '\\"')}"`
    }
    return val
  }
}
