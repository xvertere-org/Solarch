import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'

describe('Cross-Version Compatibility Fixtures (SmartTransit v0.15.7 & Live Quiz v0.18.0)', () => {
  const qb = new SqliteQueryBuilder()

  describe('SmartTransit v0.15.7 Query Patterns', () => {
    it('evaluates bus route status filters with logical AND', () => {
      const ast = parseFilter('status = "active" && route_id = "route_42"')
      expect(ast.type).toBe('group')
      expect(ast.op).toBe('AND')
      expect(ast.expressions?.length).toBe(2)

      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('(status = ? AND route_id = ?)')
      expect(params).toEqual(['active', 'route_42'])
    })

    it('evaluates passenger ticket multi-status check with IN list', () => {
      const ast = parseFilter('ticket_status in ("booked", "checked_in")')
      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('ticket_status IN (?, ?)')
      expect(params).toEqual(['booked', 'checked_in'])
    })

    it('evaluates driver assignment sort by priority and departure time', () => {
      const sortSql = qb.buildSort('priority DESC, -departure_time')
      expect(sortSql).toBe('priority DESC, departure_time DESC')
    })
  })

  describe('Live Quiz v0.18.0 Query Patterns', () => {
    it('evaluates quiz session active unspaced filter (F-001 fix verification)', () => {
      const ast = parseFilter('session_state=active')
      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('session_state = ?')
      expect(params).toEqual(['active'])
    })

    it('evaluates question list retrieval with IN list (F-002 fix verification)', () => {
      const ast = parseFilter('question_id in ("q1", "q2", "q3", "q4")')
      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('question_id IN (?, ?, ?, ?)')
      expect(params).toEqual(['q1', 'q2', 'q3', 'q4'])
    })

    it('evaluates player score filter with unspaced greater-than-or-equal', () => {
      const ast = parseFilter('score>=500')
      const { where, params } = qb.buildWhere(ast)
      expect(where).toBe('score >= ?')
      expect(params).toEqual([500])
    })

    it('evaluates leaderboard sorting by score DESC, created_at ASC', () => {
      const sortSql = qb.buildSort('score DESC, created_at ASC')
      expect(sortSql).toBe('score DESC, created_at ASC')
    })
  })
})
