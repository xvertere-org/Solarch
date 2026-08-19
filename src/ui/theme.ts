/**
 * Solarch CLI Theme & Formatting System
 * Provides cohesive, accessible styling, color tokens, and layout primitives for CLI interactions.
 */

// Zero-dependency terminal formatting using standard ANSI escape sequences
export const colors = {
  reset: (text: string) => `\x1b[0m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[23m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[24m`,
  inverse: (text: string) => `\x1b[7m${text}\x1b[27m`,

  // Foreground colors
  black: (text: string) => `\x1b[30m${text}\x1b[39m`,
  red: (text: string) => `\x1b[31m${text}\x1b[39m`,
  green: (text: string) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[39m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[39m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[39m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[39m`,
  white: (text: string) => `\x1b[37m${text}\x1b[39m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[39m`,

  // Background colors
  bgBlack: (text: string) => `\x1b[40m${text}\x1b[49m`,
  bgCyan: (text: string) => `\x1b[46m${text}\x1b[49m`,
  bgMagenta: (text: string) => `\x1b[45m${text}\x1b[49m`,
  bgBlue: (text: string) => `\x1b[44m${text}\x1b[49m`,
  bgGreen: (text: string) => `\x1b[42m${text}\x1b[49m`,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[49m`,
  bgRed: (text: string) => `\x1b[41m${text}\x1b[49m`,
}

export const symbols = {
  info: 'ℹ',
  success: '✔',
  warn: '⚠',
  error: '✖',
  pointer: '›',
  bullet: '•',
  dash: '─',
  corner: '└',
  pipe: '│',
  sparkle: '⚡',
}

export interface ThemeConfig {
  primaryColor: (text: string) => string
  successColor: (text: string) => string
  warningColor: (text: string) => string
  errorColor: (text: string) => string
  dimColor: (text: string) => string
}

export const defaultTheme: ThemeConfig = {
  primaryColor: colors.cyan,
  successColor: colors.green,
  warningColor: colors.yellow,
  errorColor: colors.red,
  dimColor: colors.gray,
}

/**
 * Format a step badge, e.g. [1/4] in styled format
 */
export function formatStep(step: number, total: number, label?: string): string {
  const badge = colors.dim(`[${step}/${total}]`)
  return label ? `${badge} ${colors.bold(label)}` : badge
}

/**
 * Format a status badge
 */
export function formatBadge(text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): string {
  switch (type) {
    case 'success':
      return colors.bgGreen(colors.black(` ${text} `))
    case 'warn':
      return colors.bgYellow(colors.black(` ${text} `))
    case 'error':
      return colors.bgRed(colors.white(` ${text} `))
    case 'info':
    default:
      return colors.bgCyan(colors.black(` ${text} `))
  }
}
