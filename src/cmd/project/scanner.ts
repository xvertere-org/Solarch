/**
 * Artifact Scanner for Solarch Project Lifecycle.
 * Identifies removable runtime artifacts while strictly preserving core source code, configuration, and migrations.
 */

import fs from 'fs'
import path from 'path'

export const REMOVABLE_TARGETS = [
  'pb_data',
  'coverage',
  '.tmp',
  'logs',
  '.turbo',
]

export const PROTECTED_TARGETS = [
  'solarch.config.ts',
  'solarch.config.js',
  'solarch.config.json',
  '.env',
  'pb_migrations',
  'src',
  'package.json',
]

/**
 * Scans the project directory for existing removable runtime artifacts
 */
export function scanRemovableArtifacts(cwd: string): string[] {
  const found: string[] = []

  for (const target of REMOVABLE_TARGETS) {
    const fullPath = path.join(cwd, target)
    if (fs.existsSync(fullPath)) {
      found.push(target)
    }
  }

  return found
}
