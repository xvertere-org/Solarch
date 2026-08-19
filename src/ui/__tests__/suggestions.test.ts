import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  findClosestCommand,
  formatUnknownCommandSuggestion,
} from '../suggestions'

describe('Typo Detection & Command Suggestions', () => {
  it('1. calculates correct Levenshtein distance', () => {
    expect(levenshteinDistance('migrate', 'migarte')).toBe(2)
    expect(levenshteinDistance('init', 'int')).toBe(1)
    expect(levenshteinDistance('doctor', 'docktor')).toBe(1)
    expect(levenshteinDistance('exact', 'exact')).toBe(0)
  })

  it('2. matches typo "migarte" to "migrate"', () => {
    const suggestion = findClosestCommand('migarte')
    expect(suggestion).toBe('migrate')
  })

  it('3. matches typo "int" to "init"', () => {
    const suggestion = findClosestCommand('int')
    expect(suggestion).toBe('init')
  })

  it('4. matches typo "docter" to "doctor"', () => {
    const suggestion = findClosestCommand('docter')
    expect(suggestion).toBe('doctor')
  })

  it('5. formats unknown command suggestion output', () => {
    const output = formatUnknownCommandSuggestion('migarte')
    expect(output).toContain('Unknown command: migarte')
    expect(output).toContain('Did you mean?')
    expect(output).toContain('→ migrate')
    expect(output).toContain('solarch migrate --help')
  })
})
