/**
 * Reusable CLI banners and header formatters for Solarch.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { colors } from './theme.js'

/**
 * Dynamically load the Solarch package version
 */
export function getVersion(): string {
  try {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      return pkg.version || '0.20.0'
    }
  } catch {}
  return '0.20.0'
}

/**
 * Returns formatted main CLI banner text
 */
export function formatBanner(customVersion?: string): string {
  const version = customVersion || getVersion()
  return [
    '',
    colors.bold(colors.cyan(`⚡ Solarch CLI v${version}`)),
    '',
    colors.dim('Developer Backend Platform'),
    '',
    `${colors.bold('Build.')}`,
    `${colors.bold('Deploy.')}`,
    `${colors.bold('Scale.')}`,
    '',
  ].join('\n')
}

/**
 * Prints the main CLI banner to console
 */
export function printBanner(customVersion?: string): void {
  console.log(formatBanner(customVersion))
}

/**
 * Prints a command-specific header
 */
export function printCommandHeader(title: string): void {
  console.log(`\n${colors.bold(colors.cyan(`⚡ ${title}`))}\n`)
}

/**
 * Prints detailed version, runtime, and platform info
 */
export function printVersionDetails(customVersion?: string): void {
  const version = customVersion || getVersion()
  console.log(`\n${colors.bold(colors.cyan('⚡ Solarch CLI'))}\n`)
  console.log(`${colors.dim('Version:')}`)
  console.log(`${version}\n`)
  console.log(`${colors.dim('Node:')}`)
  console.log(`${process.version}\n`)
  console.log(`${colors.dim('Platform:')}`)
  console.log(`${os.platform()}-${os.arch()}\n`)
}
