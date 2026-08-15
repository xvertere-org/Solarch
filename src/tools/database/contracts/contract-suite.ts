import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseDriver, DatabaseCapabilities, DatabaseQuery } from '../types'
import { DatabaseError, DatabaseErrorCode, isConstraintError } from '../errors'

export interface ContractDriverFactory {
  (): DatabaseDriver
}

export interface ContractSuiteOptions {
  closeAfterEach?: boolean
  cleanup?: (driver: DatabaseDriver) => Promise<void>
  supportsTransactions?: boolean
}

export function runDatabaseContractSuite(
  suiteName: string,
  createDriver: ContractDriverFactory,
  expectedCapabilities: DatabaseCapabilities,
  options?: ContractSuiteOptions,
) {
  describe(`${suiteName} contract suite`, () => {
    let driver: DatabaseDriver

    beforeEach(async () => {
      driver = createDriver()
      await driver.connect()
      if (options?.cleanup) await options.cleanup(driver)
    })

    afterEach(async () => {
      if (options?.closeAfterEach ?? true) await driver.close()
    })

    describe('connection contract', () => {
      it('connect and close are idempotent', async () => {
        await driver.connect()
        await driver.close()
      })
    })

    describe('query contract', () => {
      beforeEach(async () => {
        await driver.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, qty INTEGER)')
      })

      it('query returns rows', async () => {
        await driver.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', [1, 'a', 1])
        const rows = await driver.query('SELECT * FROM items ORDER BY id')
        expect(rows).toHaveLength(1)
        expect(rows[0].name).toBe('a')
      })

      it('queryOne returns row or null', async () => {
        await driver.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', [1, 'a', 1])
        expect((await driver.queryOne('SELECT * FROM items WHERE name = ?', ['a']))?.qty).toBe(1)
        expect(await driver.queryOne('SELECT * FROM items WHERE name = ?', ['zzz'])).toBeNull()
      })

      it('execute reports changes', async () => {
        const result = await driver.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', [1, 'a', 1])
        expect(result.changes).toBe(1)
      })

      it('dialect compiles filter AST into text+params', async () => {
        const query: DatabaseQuery = driver.compileFilter(
          { type: 'expression', field: 'qty', operator: '>=', value: 5 },
          'SELECT * FROM items',
        )
        if (driver.getDialect() === 'mongodb') {
          expect(JSON.parse(query.text)).toEqual({ qty: { $gte: 5 } })
        } else {
          expect(query.text).toMatch(/WHERE .+>= \?$/)
          expect(query.params).toEqual([5])
        }
        const rows = await driver.query(query.text, query.params)
        expect(rows).toEqual([])
      })

      it('query placeholder styles are driver-internal', async () => {
        await driver.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', [1, 'x', 3])
        const rows = await driver.query('SELECT * FROM items WHERE qty >= ? AND name LIKE ?', [2, '%x%'])
        expect(rows).toHaveLength(1)
      })
    })

    describe.skipIf(options?.supportsTransactions === false)('transaction contract', () => {
      beforeEach(async () => {
        await driver.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)')
      })

      it('commits work and rolls back on throw', async () => {
        await driver.transaction(async () => {
          await driver.execute('INSERT INTO items (id, name) VALUES (?, ?)', [1, 'a'])
        })
        expect((await driver.query('SELECT COUNT(*) as c FROM items'))[0].c).toBe(1)

        await expect(driver.transaction(async () => {
          await driver.execute('INSERT INTO items (id, name) VALUES (?, ?)', [2, 'b'])
          throw new Error('boom')
        })).rejects.toThrow('boom')
        expect((await driver.query('SELECT COUNT(*) as c FROM items'))[0].c).toBe(1)
      })

      it('rejects nested transactions', async () => {
        await expect(driver.transaction(async () => {
          await driver.transaction(async () => { })
        })).rejects.toThrow(/nested/i)
      })
    })

    describe('schema contract', () => {
      it('createTable / hasTable / tableInfo roundtrip', async () => {
        await driver.createTable('widgets', [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'label', type: 'TEXT', notNull: true },
          { name: 'score', type: 'REAL' },
        ])
        expect(await driver.hasTable('widgets')).toBe(true)
        expect(await driver.hasTable('nope')).toBe(false)
        const info = await driver.tableInfo('widgets')
        expect(info.map(c => c.name)).toEqual(['id', 'label', 'score'])
      })

      it('addColumn / dropColumn', async () => {
        await driver.createTable('widgets', [{ name: 'id', type: 'INTEGER', primaryKey: true }])
        await driver.addColumn('widgets', { name: 'extra', type: 'TEXT' })
        expect((await driver.tableInfo('widgets')).map(c => c.name)).toContain('extra')
        await driver.dropColumn('widgets', 'extra')
        expect((await driver.tableInfo('widgets')).map(c => c.name)).not.toContain('extra')
      })

      it('indexes', async () => {
        await driver.createTable('widgets', [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'label', type: 'TEXT' }])
        await driver.createIndex('widgets', 'idx_widgets_label', ['label'])
        expect(await driver.tableIndexes('widgets')).toHaveProperty('idx_widgets_label')
        await driver.dropIndex('idx_widgets_label')
        expect(await driver.tableIndexes('widgets')).not.toHaveProperty('idx_widgets_label')
      })

      it('views: saveView / dropView', async () => {
        await driver.createTable('widgets', [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'label', type: 'TEXT' }])
        await driver.saveView('v_widgets', 'SELECT id, label FROM widgets')
        expect(await driver.hasTable('v_widgets')).toBe(true)
        await driver.dropView('v_widgets')
        expect(await driver.hasTable('v_widgets')).toBe(false)
      })
    })

    describe('errors contract', () => {
      it('maps constraint failures to DatabaseError', async () => {
        await driver.createTable('widgets', [{ name: 'id', type: 'INTEGER', primaryKey: true }])
        await driver.execute('INSERT INTO widgets (id) VALUES (1)')
        const err = await driver.execute('INSERT INTO widgets (id) VALUES (1)').catch(e => e)
        expect(err).toBeInstanceOf(DatabaseError)
        expect((err as DatabaseError).code).toBe(DatabaseErrorCode.DATABASE_CONSTRAINT)
        expect(isConstraintError(err)).toBe(true)
      })

      it('maps schema errors to DATABASE_SCHEMA_ERROR', async () => {
        const err = await driver.query('SELECT * FROM missing_table').catch(e => e)
        expect(err).toBeInstanceOf(DatabaseError)
        expect((err as DatabaseError).code).toBe(DatabaseErrorCode.DATABASE_SCHEMA_ERROR)
      })
    })

    describe('capabilities contract', () => {
      it('declares provider capabilities', () => {
        expect(driver.capabilities).toEqual(expectedCapabilities)
      })
    })
  })
}