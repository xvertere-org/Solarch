import { describe, it, expect, vi } from 'vitest'
import { D1DatabaseDriver, D1DatabaseBinding, D1PreparedStatement } from '../../src/tools/database/d1/d1_driver'
import { createDatabaseDriver } from '../../src/tools/database/factory'
import { DatabaseErrorCode } from '../../src/tools/database/errors'

describe('Cloudflare D1 Database Driver Evaluation (F-003)', () => {
  function createMockD1Binding(storage: Record<string, any[]> = {}): D1DatabaseBinding {
    return {
      prepare(sql: string): D1PreparedStatement {
        let boundParams: any[] = []
        const stmt: D1PreparedStatement = {
          bind(...params: any[]) {
            boundParams = params
            return stmt
          },
          async all<T>() {
            if (sql.includes('sqlite_master') || sql.includes('table_info')) {
              return { results: [] as T[], success: true }
            }
            if (sql.includes('SELECT * FROM users')) {
              const rows = (storage.users || []) as T[]
              return { results: rows, success: true }
            }
            return { results: [] as T[], success: true }
          },
          async first<T>() {
            const res = await stmt.all<T>()
            return (res.results && res.results[0]) ?? null
          },
          async run() {
            if (sql.includes('INSERT INTO users')) {
              storage.users = storage.users || []
              storage.users.push({ id: boundParams[0], name: boundParams[1] })
              return { success: true, meta: { changes: 1, last_row_id: 1 } }
            }
            if (sql.includes('FAIL_CONSTRAINT')) {
              throw new Error('UNIQUE constraint failed: users.email')
            }
            return { success: true, meta: { changes: 1 } }
          },
        }
        return stmt
      },
      async batch(statements: D1PreparedStatement[]) {
        const results = []
        for (const s of statements) {
          results.push(await s.all())
        }
        return results
      },
      async exec(sql: string) {
        return { count: 1, duration: 1 }
      },
    }
  }

  it('instantiates D1DatabaseDriver via createDatabaseDriver factory', () => {
    const mockBinding = createMockD1Binding()
    const driver = createDatabaseDriver({
      provider: 'd1',
      binding: mockBinding,
    })

    expect(driver.provider).toBe('d1')
    expect(driver.getDialect()).toBe('d1')
    expect(driver.capabilities.joins).toBe(true)
    expect(driver.capabilities.jsonOperations).toBe(true)
    expect(driver.capabilities.indexes).toBe(true)
    expect(driver.capabilities.transactions).toBe(false) // Verified: D1 uses batch execution, not interactive transactions
  })

  it('executes query, queryOne, and execute with parameter binding', async () => {
    const storage: Record<string, any[]> = { users: [{ id: 'u1', name: 'Alice' }] }
    const mockBinding = createMockD1Binding(storage)
    const driver = new D1DatabaseDriver(mockBinding)

    const users = await driver.query('SELECT * FROM users')
    expect(users).toEqual([{ id: 'u1', name: 'Alice' }])

    const user = await driver.queryOne('SELECT * FROM users WHERE id = ?', ['u1'])
    expect(user).toEqual({ id: 'u1', name: 'Alice' })

    const res = await driver.execute('INSERT INTO users (id, name) VALUES (?, ?)', ['u2', 'Bob'])
    expect(res.changes).toBe(1)
    expect(storage.users.length).toBe(2)
  })

  it('rejects interactive multi-roundtrip transactions with explicit capability error', async () => {
    const mockBinding = createMockD1Binding()
    const driver = new D1DatabaseDriver(mockBinding)

    await expect(driver.transaction(async () => {
      return 'ok'
    })).rejects.toThrowError(/Interactive multi-roundtrip transactions are unsupported on Cloudflare D1/i)
  })

  it('executes batch operations atomically', async () => {
    const mockBinding = createMockD1Binding()
    const driver = new D1DatabaseDriver(mockBinding)

    const batchRes = await driver.batch([
      { sql: 'INSERT INTO users (id, name) VALUES (?, ?)', params: ['u3', 'Charlie'] },
      { sql: 'INSERT INTO users (id, name) VALUES (?, ?)', params: ['u4', 'Dana'] },
    ])
    expect(batchRes.length).toBe(2)
  })

  it('maps D1 constraint errors to canonical DatabaseError with CONSTRAINT code', async () => {
    const mockBinding = createMockD1Binding()
    const driver = new D1DatabaseDriver(mockBinding)

    try {
      await driver.execute('FAIL_CONSTRAINT')
      expect.unreachable('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe(DatabaseErrorCode.DATABASE_CONSTRAINT)
    }
  })
})
