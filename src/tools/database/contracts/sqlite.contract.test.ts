import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { SqliteDriver } from '../sqlite/driver'
import { createDatabaseDriver } from '../factory'
import { DatabaseError } from '../errors'
import { SQLITE_CAPABILITIES } from '../capabilities'
import { DatabaseDriver } from '../types'
import { runDatabaseContractSuite } from './contract-suite'

let tmpDir: string
let driver: SqliteDriver

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-contract-'))
  driver = new SqliteDriver(tmpDir)
})

afterEach(async () => {
  await driver.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

runDatabaseContractSuite('sqlite', () => new SqliteDriver(tmpDir), SQLITE_CAPABILITIES)

describe('sqlite connection specifics', () => {
  it('opens both data and auxiliary databases', async () => {
    expect(driver.getDataDB().name.endsWith('data.db')).toBe(true)
    expect(driver.getAuxDB().name.endsWith('auxiliary.db')).toBe(true)
  })
})

describe('sqlite-specific extensions', () => {
  beforeEach(async () => {
    await driver.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, qty INTEGER)')
  })

  it('execute reports lastInsertRowid', async () => {
    const result = await driver.execute('INSERT INTO items (name, qty) VALUES (?, ?)', ['a', 1])
    expect(result.lastInsertRowid).toBe(1)
  })

  it('prepare exposes run/get/all statements', async () => {
    const stmt = driver.prepare('INSERT INTO items (name, qty) VALUES (?, ?)')
    stmt.run('b', 2)
    expect(driver.prepare('SELECT qty FROM items WHERE name = ?').get('b')).toEqual({ qty: 2 })
    expect(driver.prepare('SELECT * FROM items').all()).toHaveLength(1)
  })
})

describe('factory contract', () => {
  it('creates a sqlite driver and rejects invalid configurations', () => {
    const d = createDatabaseDriver({ provider: 'sqlite', dataDir: tmpDir }) as DatabaseDriver
    expect(d.provider).toBe('sqlite')
    expect(() => createDatabaseDriver({ provider: 'postgres', dataDir: tmpDir } as any)).toThrow(DatabaseError)
    expect(() => createDatabaseDriver({ provider: 'postgres', connectionString: '' })).toThrow(/connectionString/)
    expect(() => createDatabaseDriver({ provider: 'cassandra' as any, dataDir: tmpDir })).toThrow(
      /Unsupported database provider "cassandra"/,
    )
  })
})