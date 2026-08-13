import { describe, it, expect } from 'vitest'
import { PostgresDriver } from '../postgres/driver'
import { NeonConnection } from '../postgres/connection'
import { translatePlaceholders } from '../postgres/translate'
import { POSTGRES_CAPABILITIES } from '../capabilities'
import { createDatabaseDriver } from '../factory'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { runDatabaseContractSuite } from './contract-suite'

const connectionString = process.env.PG_TEST_CONNECTION_STRING

describe.skipIf(!connectionString)('postgres', () => {
  const cs = connectionString!

  runDatabaseContractSuite(
    'postgres',
    () => new PostgresDriver({ provider: 'postgres', connectionString: cs }),
    POSTGRES_CAPABILITIES,
    {
      cleanup: async driver => {
        await driver.exec('DROP VIEW IF EXISTS v_widgets')
        await driver.exec('DROP TABLE IF EXISTS widgets')
        await driver.exec('DROP TABLE IF EXISTS items')
      },
    },
  )

  describe('postgres-specific extensions', () => {
    it('translates ? placeholders to $n outside string literals', () => {
      expect(translatePlaceholders('SELECT * FROM t WHERE a = ? AND b = ?')).toBe('SELECT * FROM t WHERE a = $1 AND b = $2')
      expect(translatePlaceholders("SELECT 'it''s ? fine' AS x, ? AS y")).toBe("SELECT 'it''s ? fine' AS x, $1 AS y")
      expect(translatePlaceholders('SELECT ? + ?')).toBe('SELECT $1 + $2')
    })

    it('translatePlaceholders is idempotent for $n input', () => {
      expect(translatePlaceholders('SELECT $1, $2')).toBe('SELECT $1, $2')
    })

    it('supports LIMIT ? OFFSET ? parameterization', async () => {
      const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs })
      try {
        await driver.connect()
        await driver.exec('DROP TABLE IF EXISTS limtest')
        await driver.exec('CREATE TABLE limtest (id INTEGER, name TEXT)')
        for (const [id, name] of [[1, 'a'], [2, 'b'], [3, 'c']] as const) {
          await driver.execute('INSERT INTO limtest (id, name) VALUES (?, ?)', [id, name])
        }
        const rows = await driver.query('SELECT * FROM limtest ORDER BY id LIMIT ? OFFSET ?', [2, 1])
        expect(rows.map(r => r.id)).toEqual([2, 3])
        await driver.exec('DROP TABLE limtest')
      } finally {
        await driver.close()
      }
    })

    it('implements json operators via jsonb casts', async () => {
      const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs })
      try {
        await driver.connect()
        await driver.exec('DROP TABLE IF EXISTS jsontest')
        await driver.exec('CREATE TABLE jsontest (id INTEGER PRIMARY KEY, tags TEXT)')
        await driver.execute('INSERT INTO jsontest (id, tags) VALUES (?, ?)', [1, JSON.stringify(['red', 'blue'])])
        await driver.execute('INSERT INTO jsontest (id, tags) VALUES (?, ?)', [2, JSON.stringify(['green'])])

        const eq = driver.compileFilter(
          { type: 'expression', field: 'tags', operator: '?=', value: 'red' },
          'SELECT * FROM jsontest',
        )
        const eqRows = await driver.query(eq.text, eq.params)
        expect(eqRows.map(r => r.id)).toEqual([1])

        const like = driver.compileFilter(
          { type: 'expression', field: 'tags', operator: '?:', value: 'lu' },
          'SELECT * FROM jsontest',
        )
        const likeRows = await driver.query(like.text, like.params)
        expect(likeRows.map(r => r.id)).toEqual([1])

        await driver.exec('DROP TABLE jsontest')
      } finally {
        await driver.close()
      }
    })

    it('maps duplicate key to DATABASE_CONSTRAINT', async () => {
      const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs })
      try {
        await driver.connect()
        await driver.exec('DROP TABLE IF EXISTS errtest')
        await driver.exec('CREATE TABLE errtest (id INTEGER PRIMARY KEY)')
        await driver.execute('INSERT INTO errtest (id) VALUES (1)')
        const err = await driver.execute('INSERT INTO errtest (id) VALUES (1)').catch(e => e)
        expect(err).toBeInstanceOf(DatabaseError)
        expect((err as DatabaseError).code).toBe(DatabaseErrorCode.DATABASE_CONSTRAINT)
        await driver.exec('DROP TABLE errtest')
      } finally {
        await driver.close()
      }
    })

    it('returns no lastInsertRowid and reports changes on execute', async () => {
      const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs })
      try {
        await driver.connect()
        await driver.exec('DROP TABLE IF EXISTS exectest')
        await driver.exec('CREATE TABLE exectest (id INTEGER PRIMARY KEY, name TEXT)')
        const result = await driver.execute('INSERT INTO exectest (id, name) VALUES (?, ?)', [1, 'x'])
        expect(result.changes).toBe(1)
        expect(result.lastInsertRowid).toBeUndefined()
        await driver.exec('DROP TABLE exectest')
      } finally {
        await driver.close()
      }
    })

    it('handles concurrent queries and transactions without pool exhaustion (DB-PG-14/15)', async () => {
      const driver = new PostgresDriver({ provider: 'postgres', connectionString: cs })
      try {
        await driver.connect()
        await driver.exec('DROP TABLE IF EXISTS conctest')
        await driver.exec('CREATE TABLE conctest (id INTEGER PRIMARY KEY, name TEXT)')

        const parallelQueries = Array.from({ length: 25 }, (_, i) =>
          driver.query('SELECT ?::int AS n', [i]),
        )
        const queryRows = await Promise.all(parallelQueries)
        expect(queryRows.map(r => r[0].n).sort((a, b) => a - b)).toEqual(
          Array.from({ length: 25 }, (_, i) => i),
        )

        const parallelTx = Array.from({ length: 10 }, (_, i) =>
          driver.transaction(async () => {
            await driver.execute('INSERT INTO conctest (id, name) VALUES (?, ?)', [i, `tx${i}`])
            await driver.query('SELECT COUNT(*) FROM conctest')
          }),
        )
        await Promise.all(parallelTx)

        const count = await driver.queryOne<{ count: number }>('SELECT COUNT(*) FROM conctest')
        expect(Number(count!.count)).toBe(10)

        await driver.ping()
        await driver.exec('DROP TABLE conctest')
      } finally {
        await driver.close()
      }
    })
  })
})

describe('postgres driver configuration validation', () => {
  it('rejects empty connectionString', () => {
    expect(() => new PostgresDriver({ provider: 'postgres', connectionString: '  ' })).toThrow(/connectionString/)
  })

  it('rejects driver "postgres" with non-tcp mode', () => {
    expect(() => new PostgresDriver({ provider: 'postgres', connectionString: 'x', mode: 'http' as any })).toThrow(/tcp/)
    expect(() => createDatabaseDriver({ provider: 'postgres', connectionString: 'x', driver: 'postgres', mode: 'websocket' as any })).toThrow(DatabaseError)
  })

  it('rejects driver "neon" without http/websocket mode', () => {
    expect(() => new PostgresDriver({ provider: 'postgres', connectionString: 'x', driver: 'neon', mode: 'tcp' as any })).toThrow(/http|websocket/)
    expect(() => createDatabaseDriver({ provider: 'postgres', connectionString: 'x', driver: 'neon' })).toThrow(/http|websocket/)
  })

  it('does not leak connectionString in error messages', () => {
    const secret = 'postgres://user:supersecretpw@host:5432/db'
    try {
      new PostgresDriver({ provider: 'postgres', connectionString: secret, mode: 'http' as any })
    } catch (err) {
      expect(String(err)).not.toContain('supersecretpw')
    }
  })

  it('Neon HTTP strategy rejects transactions with actionable error', async () => {
    const conn = new NeonConnection('postgres://user:pass@host:5432/db', 'http')
    await expect(conn.transaction(async () => 1)).rejects.toThrow(/websocket/)
  })
})