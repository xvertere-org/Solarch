/**
 * Solarch CLI Package Manager Detection & Runner (Phase 3)
 *
 * Implements deterministic package manager detection across npm, pnpm, yarn, and bun.
 */

import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { PackageManagerType } from './types.js'

export class PackageManagerDetector {
  /**
   * Deterministically detects the appropriate package manager following strict precedence:
   * 1. Explicit override (e.g. --manager flag)
   * 2. `packageManager` field in package.json
   * 3. Lockfile inspection in target directory or ancestors
   * 4. npm fallback
   */
  public static detect(
    projectDir: string = process.cwd(),
    overrideManager?: PackageManagerType
  ): PackageManagerType {
    if (overrideManager) {
      return overrideManager
    }

    // 2. Check package.json packageManager field
    const pkgPath = path.join(projectDir, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (typeof pkg.packageManager === 'string') {
          const pm = pkg.packageManager.toLowerCase()
          if (pm.startsWith('pnpm')) return 'pnpm'
          if (pm.startsWith('yarn')) return 'yarn'
          if (pm.startsWith('bun')) return 'bun'
          if (pm.startsWith('npm')) return 'npm'
        }
      } catch {}
    }

    // 3. Lockfile inspection in projectDir and parents
    let curr = path.resolve(projectDir)
    while (curr && curr !== path.dirname(curr)) {
      if (fs.existsSync(path.join(curr, 'pnpm-lock.yaml'))) return 'pnpm'
      if (fs.existsSync(path.join(curr, 'yarn.lock'))) return 'yarn'
      if (
        fs.existsSync(path.join(curr, 'bun.lockb')) ||
        fs.existsSync(path.join(curr, 'bun.lock'))
      ) {
        return 'bun'
      }
      if (fs.existsSync(path.join(curr, 'package-lock.json'))) return 'npm'

      curr = path.dirname(curr)
    }

    // 4. Default fallback
    return 'npm'
  }

  public static getInstallCommand(
    pm: PackageManagerType,
    packages: string[],
    isDev: boolean = false
  ): string {
    const pkgList = packages.join(' ')
    switch (pm) {
      case 'pnpm':
        return `pnpm add ${isDev ? '-D ' : ''}${pkgList}`
      case 'yarn':
        return `yarn add ${isDev ? '--dev ' : ''}${pkgList}`
      case 'bun':
        return `bun add ${isDev ? '-d ' : ''}${pkgList}`
      case 'npm':
      default:
        return `npm install ${isDev ? '--save-dev ' : ''}${pkgList}`
    }
  }

  public static getUninstallCommand(
    pm: PackageManagerType,
    packages: string[]
  ): string {
    const pkgList = packages.join(' ')
    switch (pm) {
      case 'pnpm':
        return `pnpm remove ${pkgList}`
      case 'yarn':
        return `yarn remove ${pkgList}`
      case 'bun':
        return `bun remove ${pkgList}`
      case 'npm':
      default:
        return `npm uninstall ${pkgList}`
    }
  }

  public static async execute(command: string, cwd: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Command failed: ${command}\n${stderr || err.message}`))
        } else {
          resolve(stdout)
        }
      })
    })
  }
}
