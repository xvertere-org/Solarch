import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'
import { validateRelationalIdentifier } from '../../src/utils/sql_safe'

describe('Relational Identifiers (F-006) & Sort Normalization (F-004)', () => {
  const qb = new SqliteQueryBuilder()

  describe('F-006: Relational Field Handling', () => {
    it('validates single and dotted relational identifiers safely', () => {
      expect(validateRelationalIdentifier('author')).toBe('author')
      expect(validateRelationalIdentifier('author.name')).toBe('author.name')
      expect(validateRelationalIdentifier('user.profile.avatar')).toBe('user.profile.avatar')
    })

    it('rejects malicious or malformed relational paths', () => {
      const invalidPaths = [
        'author..name',
        '.author',
        'author.',
        'author;DROP TABLE users;',
        'author"name',
        'author.name OR 1=1',
      ]
      for (const path of invalidPaths) {
        expect(() => validateRelationalIdentifier(path)).toThrow()
      }
    })

    it('parses and compiles relational queries author.name = "Alice"', () => {
      const ast = parseFilter('author.name = "Alice"')
      expect(ast.type).toBe('expression')
      expect(ast.field).toBe('author.name')
      expect(ast.value).toBe('Alice')

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('author.name = ?')
      expect(params).toEqual(['Alice'])
    })
  })

  describe('F-004: Sort Syntax Normalization', () => {
    it('supports -field and +field prefix syntax', () => {
      expect(qb.buildSort('-created_at')).toBe('created_at DESC')
      expect(qb.buildSort('+created_at')).toBe('created_at ASC')
      expect(qb.buildSort('created_at')).toBe('created_at ASC')
    })

    it('supports SQL keyword syntax created_at DESC and created_at ASC', () => {
      expect(qb.buildSort('created_at DESC')).toBe('created_at DESC')
      expect(qb.buildSort('created_at desc')).toBe('created_at DESC')
      expect(qb.buildSort('created_at ASC')).toBe('created_at ASC')
      expect(qb.buildSort('created_at asc')).toBe('created_at ASC')
    })

    it('supports multi-column comma-separated sort strings', () => {
      expect(qb.buildSort('title ASC, -created_at')).toBe('title ASC, created_at DESC')
      expect(qb.buildSort('priority DESC, id ASC')).toBe('priority DESC, id ASC')
    })

    it('rejects SQL injection in sort expressions', () => {
      expect(() => qb.buildSort('created_at; DROP TABLE users')).toThrow()
      expect(() => qb.buildSort('created_at DESC; DROP TABLE users')).toThrow()
      expect(() => qb.buildSort('created_at OR 1=1')).toThrow()
    })
  })
})
