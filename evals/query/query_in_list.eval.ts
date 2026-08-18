import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'

describe('Query IN List-Expression Evaluation (F-002)', () => {
  const qb = new SqliteQueryBuilder()

  describe('F-002: IN list expression parsing and SQL compilation', () => {
    it('parses id in ("a", "b") as array value and compiles to IN (?, ?)', () => {
      const ast = parseFilter('id in ("a", "b")')
      expect(ast.type).toBe('expression')
      expect(ast.field).toBe('id')
      expect(ast.operator).toBe('in')
      expect(Array.isArray(ast.value)).toBe(true)
      expect(ast.value).toEqual(['a', 'b'])

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('id IN (?, ?)')
      expect(params).toEqual(['a', 'b'])
    })

    it('parses id in ("a", "b", "c") with three elements', () => {
      const ast = parseFilter('id in ("a", "b", "c")')
      expect(ast.value).toEqual(['a', 'b', 'c'])

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('id IN (?, ?, ?)')
      expect(params).toEqual(['a', 'b', 'c'])
    })

    it('parses id in ("a") single element list', () => {
      const ast = parseFilter('id in ("a")')
      expect(ast.value).toEqual(['a'])

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('id IN (?)')
      expect(params).toEqual(['a'])
    })

    it('parses numeric lists id in (1, 2, 3)', () => {
      const ast = parseFilter('id in (1, 2, 3)')
      expect(ast.value).toEqual([1, 2, 3])

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('id IN (?, ?, ?)')
      expect(params).toEqual([1, 2, 3])
    })

    it('parses NOT IN / not in expressions id not in ("x", "y")', () => {
      const ast = parseFilter('id not in ("x", "y")')
      expect(ast.operator).toBe('not in')
      expect(ast.value).toEqual(['x', 'y'])

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('id NOT IN (?, ?)')
      expect(params).toEqual(['x', 'y'])
    })
  })

  describe('Empty IN Semantics & Error Handling', () => {
    it('rejects empty list in syntax id in () with parse error', () => {
      expect(() => {
        parseFilter('id in ()')
      }).toThrow()
    })

    it('compiles programmatic empty array AST to 1=0 (deterministic false, never 1=1)', () => {
      const emptyAst = {
        type: 'expression' as const,
        field: 'id',
        operator: 'in',
        value: [],
      }
      const { where } = qb.buildWhere(emptyAst)
      expect(where).toBe('1=0')
      expect(where).not.toBe('1=1')
    })
  })
})
