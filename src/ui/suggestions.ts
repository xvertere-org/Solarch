/**
 * Typo detection and command suggestions for Solarch CLI using Levenshtein distance.
 */

import { COMMANDS } from './command.js'
import { colors } from './theme.js'

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an

  const matrix: number[][] = []
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[bn][an]
}

/**
 * Collects all valid primary command names and aliases
 */
export function getAllCommandNames(): string[] {
  const names: string[] = []
  for (const cmd of COMMANDS) {
    names.push(cmd.name)
    if (cmd.aliases) {
      names.push(...cmd.aliases)
    }
  }
  names.push('version', 'help')
  return Array.from(new Set(names))
}

/**
 * Finds the closest matching command for a misspelled input
 */
export function findClosestCommand(input: string, candidateCommands?: string[]): string | null {
  const candidates = candidateCommands || getAllCommandNames()
  const lower = input.toLowerCase()

  let bestMatch: string | null = null
  let minDistance = Infinity

  for (const candidate of candidates) {
    const dist = levenshteinDistance(lower, candidate.toLowerCase())
    if (dist < minDistance) {
      minDistance = dist
      bestMatch = candidate
    }
  }

  // Allow suggestions only if distance is reasonably close (e.g. <= 3 and < length)
  const maxAllowedDistance = Math.max(1, Math.min(3, Math.floor(input.length * 0.6)))
  if (minDistance <= maxAllowedDistance && bestMatch) {
    return bestMatch
  }

  return null
}

/**
 * Formats unknown command error with suggestions
 */
export function formatUnknownCommandSuggestion(input: string, candidateCommands?: string[]): string {
  const suggestion = findClosestCommand(input, candidateCommands)
  const lines: string[] = []

  lines.push('')
  lines.push(`Unknown command: ${input}`)
  lines.push('')

  if (suggestion) {
    lines.push('Did you mean?')
    lines.push(`  → ${suggestion}`)
    lines.push('')
    lines.push('Run:')
    lines.push(`  solarch ${suggestion} --help`)
  } else {
    lines.push('Run:')
    lines.push('  solarch --help')
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * Handles unknown command: prints suggestion and exits with code 1
 */
export function handleUnknownCommand(input: string, candidateCommands?: string[]): void {
  console.error(formatUnknownCommandSuggestion(input, candidateCommands))
  process.exit(1)
}
