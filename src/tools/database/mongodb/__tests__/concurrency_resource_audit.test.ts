import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { MongoDBDriver } from '../driver'
import { BaseApp } from '../../../../core/base'
import { Collection } from '../../../../core/collection'
import { RecordModel as PBRecord } from '../../../../core/record'
import { findRecordById, findAllRecords } from '../../../../core/record_query'

describe('MongoDB Concurrency, Resource & Session Leak Audit (DB-MONGO-21-24)', () => {
  let replSet: MongoMemoryReplSet
  let uri: string
  let app: BaseApp
  let testCol: Collection

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    uri = replSet.getUri()

    app = new BaseApp({
      db: {
        provider: 'mongodb',
        connectionString: uri,
        database: 'solarch_concurrency_audit',
        queryTimeout: 30,
        pool: {
          max: 20,
          min: 2,
          idleTimeoutMs: 10000,
          connectionTimeoutMs: 5000,
        },
      },
    })
    await app.bootstrap()

    testCol = new Collection({
      id: 'col_concurrency_test',
      name: 'concurrency_items',
      type: 'base',
      fields: [
        { name: 'workerId', type: 'text', required: true },
        { name: 'counter', type: 'number', required: true },
        { name: 'payload', type: 'text' },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    })
    await app.save(testCol)
  }, 60000)

  afterAll(async () => {
    if (app) {
      await app.db().getDriver().close()
    }
    if (replSet) {
      await replSet.stop()
    }
  }, 60000)

  async function runConcurrencyWorkerTest(workerCount: number, operationsPerWorker: number) {
    let unhandledErrors = 0
    const startRes = await findAllRecords(app, testCol.name)
    const startCount = startRes.totalItems

    const workerPromises = Array.from({ length: workerCount }, async (_, workerIdx) => {
      const workerId = `worker_${workerCount}_${workerIdx}`

      for (let i = 0; i < operationsPerWorker; i++) {
        try {
          // 1. Transactional write
          await app.db().transaction(async () => {
            const rec = new PBRecord(testCol.id, testCol.name, {
              workerId,
              counter: i,
              payload: `Worker ${workerIdx} op ${i} data`,
            })
            rec.id = `rec_${workerId}_${i}`
            await app.save(rec)
          })

          // 2. Read verification
          const fetched = await findRecordById(app, testCol.name, `rec_${workerId}_${i}`)
          if (!fetched || fetched.get('counter') !== i) {
            throw new Error(`Data corruption detected on worker ${workerIdx} op ${i}`)
          }
        } catch (err) {
          unhandledErrors++
          throw err
        }
      }
    })

    await Promise.all(workerPromises)

    const endRes = await findAllRecords(app, testCol.name)
    const endCount = endRes.totalItems
    const expectedTotal = startCount + workerCount * operationsPerWorker

    expect(unhandledErrors).toBe(0)
    expect(endCount).toBe(expectedTotal)

    // Check that driver has no active dangling session
    const driver = app.db().getDriver() as MongoDBDriver
    expect((driver as any).conn.getSession()).toBeUndefined()
  }

  it('Tier 1: 10 concurrent workers (100 ops total) - 0 leaks, 0 corruption', async () => {
    await runConcurrencyWorkerTest(10, 10)
  })

  it('Tier 2: 25 concurrent workers (250 ops total) - 0 leaks, 0 corruption', async () => {
    await runConcurrencyWorkerTest(25, 10)
  })

  it('Tier 3: 50 concurrent workers (250 ops total) - 0 leaks, 0 corruption', async () => {
    await runConcurrencyWorkerTest(50, 5)
  })

  it('Tier 4: 100 concurrent workers (200 ops total) - 0 leaks, 0 corruption', async () => {
    await runConcurrencyWorkerTest(100, 2)
  })
})
