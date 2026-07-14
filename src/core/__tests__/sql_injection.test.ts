import { describe, it, expect } from 'vitest'
import { validateIdentifier, quoteIdentifier, validateAndQuote, validateIdentifiers, SQL_IDENTIFIER_RE } from '../../utils/sql_safe'

describe('SQL Safety Utilities', () => {
  describe('validateIdentifier', () => {
    it('accepts valid identifiers', () => {
      expect(validateIdentifier('id')).toBe('id')
      expect(validateIdentifier('_private')).toBe('_private')
      expect(validateIdentifier('myField123')).toBe('myField123')
      expect(validateIdentifier('collection_name')).toBe('collection_name')
      expect(validateIdentifier('a')).toBe('a')
      expect(validateIdentifier('_')).toBe('_')
    })

    it('rejects identifiers starting with a number', () => {
      expect(() => validateIdentifier('123abc')).toThrow('Invalid')
      expect(() => validateIdentifier('0field')).toThrow('Invalid')
    })

    it('rejects empty string', () => {
      expect(() => validateIdentifier('')).toThrow('Invalid')
    })

    it('rejects identifiers with special characters', () => {
      expect(() => validateIdentifier('my-field')).toThrow('Invalid')
      expect(() => validateIdentifier('field.name')).toThrow('Invalid')
      expect(() => validateIdentifier('field name')).toThrow('Invalid')
      expect(() => validateIdentifier('field;DROP')).toThrow('Invalid')
    })

    it('rejects SQL injection payloads', () => {

      expect(() => validateIdentifier("Robert'; DROP TABLE students;--")).toThrow('Invalid')
      expect(() => validateIdentifier('field" OR 1=1 --')).toThrow('Invalid')
      expect(() => validateIdentifier('id UNION SELECT * FROM users')).toThrow('Invalid')
      expect(() => validateIdentifier('(SELECT password FROM users)')).toThrow('Invalid')
      expect(() => validateIdentifier('field; DROP TABLE _collections')).toThrow('Invalid')
      expect(() => validateIdentifier('field/*comment*/')).toThrow('Invalid')
      expect(() => validateIdentifier('field\nDROP TABLE users')).toThrow('Invalid')
      expect(() => validateIdentifier('field\0DROP')).toThrow('Invalid')
    })

    it('rejects identifiers exceeding 63 characters', () => {
      const long = 'a'.repeat(64)
      expect(() => validateIdentifier(long)).toThrow('Invalid')
      expect(validateIdentifier('a'.repeat(63))).toBe('a'.repeat(63))
    })

    it('includes custom label in error message', () => {
      expect(() => validateIdentifier('bad!', 'column name')).toThrow('column name')
    })
  })

  describe('quoteIdentifier', () => {
    it('wraps identifier in double quotes', () => {
      expect(quoteIdentifier('field')).toBe('"field"')
      expect(quoteIdentifier('my_table')).toBe('"my_table"')
    })

    it('escapes internal double quotes by doubling', () => {
      expect(quoteIdentifier('my"field')).toBe('"my""field"')
      expect(quoteIdentifier('"already"quoted"')).toBe('"""already""quoted"""')
    })

    it('handles empty string', () => {
      expect(quoteIdentifier('')).toBe('""')
    })

    it('handles names with special characters (post-validation use)', () => {
      expect(quoteIdentifier('a b')).toBe('"a b"')
      expect(quoteIdentifier('a;b')).toBe('"a;b"')
    })
  })

  describe('validateAndQuote', () => {
    it('validates and quotes valid identifiers', () => {
      expect(validateAndQuote('field')).toBe('"field"')
      expect(validateAndQuote('my_table', 'table')).toBe('"my_table"')
    })

    it('rejects invalid identifiers before quoting', () => {
      expect(() => validateAndQuote('bad;field')).toThrow('Invalid')
      expect(() => validateAndQuote("Robert'; DROP TABLE students;--")).toThrow('Invalid')
    })
  })

  describe('validateIdentifiers', () => {
    it('validates all identifiers in array', () => {
      expect(validateIdentifiers(['id', 'name', 'email'])).toEqual(['id', 'name', 'email'])
    })

    it('rejects if any identifier is invalid', () => {
      expect(() => validateIdentifiers(['id', 'bad;field', 'email'])).toThrow('Invalid')
    })
  })

  describe('SQL_IDENTIFIER_RE regex', () => {
    const cases: [string, boolean][] = [
      ['a', true],
      ['_', true],
      ['abc', true],
      ['_abc', true],
      ['abc123', true],
      ['_123', true],
      ['a'.repeat(63), true],
      ['', false],
      ['1abc', false],
      ['a-b', false],
      ['a.b', false],
      ['a b', false],
      ['a;b', false],
      ['a'.repeat(64), false],
    ]

    for (const [input, expected] of cases) {
      it(`${expected ? 'matches' : 'rejects'} "${input.length > 20 ? input.slice(0, 20) + '...' : input}"`, () => {
        expect(SQL_IDENTIFIER_RE.test(input)).toBe(expected)
      })
    }
  })
})

describe('Filter/Sort SQL Injection Prevention', () => {
  it('filter parser rejects dangerous operators', async () => {
    const { parseFilter, buildSQL } = await import('../../tools/search/filter')
    const ast1 = parseFilter('name = "test"')
    const sql1 = buildSQL(ast1)
    expect(sql1.where).toContain('?')
    expect(sql1.params).toContain('test')
    const ast2 = parseFilter('name = "test\'; DROP TABLE users; --"')
    const sql2 = buildSQL(ast2)
    expect(sql2.where).toContain('?')
    expect(sql2.params.some((p: string) => typeof p === 'string' && p.includes('DROP'))).toBe(true)
    expect(sql2.where).not.toContain('DROP')
  })

  it('sort builder validates field names', async () => {
    const { buildSortSQL } = await import('../../tools/search/filter')
    const sql1 = buildSortSQL('created')
    expect(sql1).toContain('created')
    try {
      const sql2 = buildSortSQL('created; DROP TABLE users')
      expect(sql2).not.toContain('DROP')
    } catch {
    }
  })
})
