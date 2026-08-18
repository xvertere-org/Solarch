import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'
import { PostgresQueryBuilder } from '../../src/tools/database/postgres/query-builder'

describe('Differential Query Evaluation: SQLite vs PostgreSQL', () => {
  const sqlite = new SqliteQueryBuilder()
  const postgres = new PostgresQueryBuilder()

  const testQueries = [
    { filter: 'status = "active"', expectedParams: ['active'] },
    { filter: 'views >= 100 && score < 50', expectedParams: [100, 50] },
    { filter: 'title ~ "solarch" || tag = "core"', expectedParams: ['%solarch%', 'core'] },
    { filter: 'id in ("1", "2", "3")', expectedParams: ['1', '2', '3'] },
    { filter: 'author.name = "Alice"', expectedParams: ['Alice'] },
  ]

  for (const q of testQueries) {
    it(`compiles "${q.filter}" with consistent parameterization across SQLite and Postgres`, () => {
      const ast = parseFilter(q.filter)

      const resSqlite = sqlite.buildWhere(ast)
      const resPostgres = postgres.buildWhere(ast)

      expect(resSqlite.params).toEqual(q.expectedParams)
      expect(resPostgres.params).toEqual(q.expectedParams)
      expect(resSqlite.where).not.toBe('1=1')
      expect(resPostgres.where).not.toBe('1=1')
    })
  }

  it('compiles sort expressions consistently across dialects', () => {
    const sorts = [
      '-created_at',
      'created_at DESC',
      'title ASC, -created_at',
    ]
    for (const s of sorts) {
      const sqliteSort = sqlite.buildSort(s)
      const postgresSort = postgres.buildSort(s)

      expect(sqliteSort).toBeTruthy()
      expect(postgresSort).toBeTruthy()
    }
  })
})
