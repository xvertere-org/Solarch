/**
 * Solarch Platform Deployment Secret Scanner & Exclusion Engine (Phase 7)
 *
 * Implements dual-layer security:
 * 1. Strict file pattern exclusion
 * 2. Source code content secret scanning
 */

import * as fs from 'fs'
import * as path from 'path'
import { DeploymentScanResult } from './types.js'

export const EXCLUDED_FILE_PATTERNS = [
  /^\.env/i,
  /\.env\..+$/i,
  /\.(pem|key|p12|pfx|crt|cer|der)$/i,
  /^(credentials|secrets|service-account|id_rsa|id_ed25519)(\..+)?$/i,
  /\.(sqlite|sqlite3|db)$/i,
]

export const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'pb_data',
  'dist',
  '.cache',
  '.turbo',
  '.solarch/state',
])

export const SECRET_CONTENT_PATTERNS: Array<{ rule: string; regex: RegExp }> = [
  {
    rule: 'Database connection URI with credentials',
    regex: /(?:DATABASE_URL|MONGODB_URI|POSTGRES_URL)\s*[:=]\s*['"]?[a-zA-Z0-9+]+:\/\/[^:]+:[^@\s'"]+@[^'"]+/i,
  },
  {
    rule: 'Raw Private Key Block',
    regex: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/,
  },
  {
    rule: 'Hardcoded API Key / Secret Token',
    regex: /(?:SECRET_KEY|API_KEY|AUTH_TOKEN|JWT_SECRET|PRIVATE_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{24,}['"]/i,
  },
  {
    rule: 'Hardcoded Bearer Token Header',
    regex: /Bearer\s+ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  },
]

export class DeploymentScanner {
  /**
   * Evaluates whether a given relative file path is excluded by layer 1 filter.
   */
  public static isExcluded(relativeFilePath: string): boolean {
    const normalized = relativeFilePath.replace(/\\/g, '/')
    const parts = normalized.split('/')

    // Check directory exclusions
    for (const part of parts.slice(0, -1)) {
      if (EXCLUDED_DIR_NAMES.has(part)) {
        return true
      }
    }

    // Check file name exclusions
    const fileName = parts[parts.length - 1]
    for (const pattern of EXCLUDED_FILE_PATTERNS) {
      if (pattern.test(fileName)) {
        return true
      }
    }

    return false
  }

  /**
   * Recursively scans directory, collects eligible files, and performs content inspection.
   */
  public static async scanProject(projectDir: string): Promise<{
    includedFiles: string[]
    scanResult: DeploymentScanResult
  }> {
    const includedFiles: string[] = []
    let excludedFilesCount = 0
    let scannedFilesCount = 0
    const leaks: DeploymentScanResult['leaks'] = []

    async function walk(dir: string, currentRelative: string = '') {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const relativePath = currentRelative ? `${currentRelative}/${entry.name}` : entry.name
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (EXCLUDED_DIR_NAMES.has(entry.name) || DeploymentScanner.isExcluded(relativePath)) {
            excludedFilesCount++
            continue
          }
          await walk(fullPath, relativePath)
        } else if (entry.isFile()) {
          if (DeploymentScanner.isExcluded(relativePath)) {
            excludedFilesCount++
            continue
          }

          includedFiles.push(relativePath)
          scannedFilesCount++

          // Content secret scan for text files
          if (
            /\.(ts|js|json|yml|yaml|md|sql|html|css|env\.example)$/i.test(entry.name) &&
            !entry.name.endsWith('.d.ts')
          ) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8')
              const lines = content.split('\n')

              for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex]
                for (const checker of SECRET_CONTENT_PATTERNS) {
                  if (checker.regex.test(line)) {
                    leaks.push({
                      file: relativePath,
                      line: lineIndex + 1,
                      rule: checker.rule,
                      snippet: line.trim().substring(0, 60),
                    })
                  }
                }
              }
            } catch {
              // Ignore binary read errors
            }
          }
        }
      }
    }

    await walk(projectDir)

    return {
      includedFiles: includedFiles.sort(),
      scanResult: {
        passed: leaks.length === 0,
        excludedFilesCount,
        scannedFilesCount,
        leaks,
      },
    }
  }
}
