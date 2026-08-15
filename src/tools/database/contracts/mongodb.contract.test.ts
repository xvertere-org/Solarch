import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { MongoDBDriver } from '../mongodb/driver'
import { createDatabaseDriver } from '../factory'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { MONGODB_CAPABILITIES } from '../capabilities'
import { DatabaseDriver } from '../types'
import { runDatabaseContractSuite } from './contract-suite'

let replSet: MongoMemoryReplSet | null = null
let testUri = process.env.MONGO_TEST_CONNECTION_STRING || process.env.MONGODB_URI

describe('MongoDB Driver Static & Contract Baseline', () => {
  const driver = new MongoDBDriver({
    provider: 'mongodb',
    connectionString: 'mongodb://localhost:27017/solarch_test',
  })

  it('declares mongodb provider and document capabilities', () => {
    expect(driver.provider).toBe('mongodb')
    expect(driver.capabilities).toEqual(MONGODB_CAPABILITIES)
    expect(driver.capabilities.foreignKeys).toBe(false)
    expect(driver.capabilities.vectorFunctions).toBe(false)
  })

  it('provides mongodb dialect with stable sort and filter compilation', () => {
    expect(driver.getDialect()).toBe('mongodb')
    expect(driver.escapeField(' title ')).toBe('title')
    const sort = driver.buildSort('-created')
    expect(JSON.parse(sort)).toEqual({ created: -1, id: 1 })
  })

  it('factory initializes MongoDBDriver with valid configuration', () => {
    const d = createDatabaseDriver({
      provider: 'mongodb',
      connectionString: 'mongodb://localhost:27017/solarch',
    }) as DatabaseDriver
    expect(d.provider).toBe('mongodb')
  })

  it('factory rejects mongodb without connectionString', () => {
    expect(() =>
      createDatabaseDriver({
        provider: 'mongodb',
        connectionString: '',
      }),
    ).toThrow()
  })
})

describe('MongoDB Live Contract & Topology Suite (DB-MONGO-18/19)', () => {
  beforeAll(async () => {
    if (!testUri) {
      replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
      testUri = replSet.getUri()
    }
  }, 60000)

  afterAll(async () => {
    if (replSet) {
      await replSet.stop()
      replSet = null
    }
  }, 60000)

  runDatabaseContractSuite(
    'mongodb',
    () => new MongoDBDriver({
      provider: 'mongodb',
      connectionString: testUri || 'mongodb://127.0.0.1:27017/solarch_contract_test',
      database: 'solarch_contract_test',
    }),
    MONGODB_CAPABILITIES,
    {
      supportsTransactions: true,
      cleanup: async (driver: DatabaseDriver) => {
        await driver.dropTable('items').catch(() => {})
        await driver.dropTable('widgets').catch(() => {})
        await driver.dropTable('v_widgets').catch(() => {})
      },
    },
  )
})

