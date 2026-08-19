/**
 * Standardized status output helpers for Solarch CLI.
 */

import { colors } from './theme.js'

export function success(message: string): void {
  console.log(`${colors.green('✔')} ${message}`)
}

export function warning(message: string): void {
  console.log(`${colors.yellow('⚠')} ${message}`)
}

export function failure(message: string): void {
  console.log(`${colors.red('✖')} ${message}`)
}

export function info(message: string): void {
  console.log(`${colors.cyan('ℹ')} ${message}`)
}

export const output = {
  success,
  warning,
  failure,
  info,
}
