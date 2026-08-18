import { describe, it, expect } from 'vitest'
import { parseFilter, QueryParseError } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'

describe('Query Security Invariants Evaluation (F-001)', () => {
  const qb = new SqliteQueryBuilder()

  describe('Invariant 1: Unspaced operators must tokenize and parse correctly (F-001)', () => {
    it('parses unspaced comparison operators without falling back to empty AST', () => {
      const ast = parseFilter('status>=published')
      expect(ast.type).toBe('expression')
      expect(ast.field).toBe('status')
      expect(ast.operator).toBe('>=')
      expect(ast.value).toBe('published')

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('status >= ?')
      expect(params).toEqual(['published'])
      expect(where).not.toBe('1=1')
      expect(where).not.toBe('(1=1)')
    })

    it('parses various unspaced operators identically to their spaced counterparts', () => {
      const cases = [
        { input: 'views>100', expectedOp: '>', expectedVal: 100, expectedWhere: 'views > ?' },
        { input: 'views>=100', expectedOp: '>=', expectedVal: 100, expectedWhere: 'views >= ?' },
        { input: 'views<50', expectedOp: '<', expectedVal: 50, expectedWhere: 'views < ?' },
        { input: 'views<=50', expectedOp: '<=', expectedVal: 50, expectedWhere: 'views <= ?' },
        { input: 'title~quiz', expectedOp: '~', expectedVal: 'quiz', expectedWhere: 'title LIKE ?' },
        { input: 'tag!~spam', expectedOp: '!~', expectedVal: 'spam', expectedWhere: 'tag NOT LIKE ?' },
        { input: 'active!=false', expectedOp: '!=', expectedVal: false, expectedWhere: 'active != ?' },
      ]

      for (const c of cases) {
        const ast = parseFilter(c.input)
        expect(ast.type).toBe('expression')
        expect(ast.operator).toBe(c.expectedOp)
        expect(ast.value).toBe(c.expectedVal)

        const { where } = qb.buildWhere(ast)
        expect(where).toBe(c.expectedWhere)
        expect(where).not.toBe('1=1')
      }
    })
  })

  describe('Invariant 2: Malformed filter input must NEVER silently produce 1=1 (F-001 Security Boundary)', () => {
    const malformedQueries = [
      'status>>=published',
      'status???published',
      'status>=',
      '>=published',
      'views > > 100',
      'status = = published',
      '(status = "active"',
      'status = "active")',
      'status = "active" &&',
      '&& status = "active"',
      'status = "active" ||',
      '|| status = "active"',
      'id in ()',
    ]

    for (const badQuery of malformedQueries) {
      it(`rejects malformed query "${badQuery}" with QueryParseError`, () => {
        expect(() => {
          parseFilter(badQuery)
        }).toThrow()
      })
    }
  })

  describe('Invariant 3: Safe Parameterization & Injection Resistance', () => {
    it('parameterizes values containing SQL fragments and never injects raw SQL', () => {
      const ast = parseFilter('title = "test\'; DROP TABLE users; --"')
      const { where, params } = qb.buildWhere(ast)

      expect(where).toBe('title = ?')
      expect(params).toEqual(["test'; DROP TABLE users; --"])
    })
  })
})
