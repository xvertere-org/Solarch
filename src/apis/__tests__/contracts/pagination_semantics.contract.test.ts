import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parsePagination, calculateTotalPages, DEFAULT_PAGE, DEFAULT_PER_PAGE, MAX_PAGE, MAX_PER_PAGE } from '../../../utils/pagination'
import { Solarch } from '../../../solarch'
import { Collection } from '../../../core/collection'
import { RecordModel as PBRecord } from '../../../core/record'
import { findAllRecords } from '../../../core/record_query'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Semantic Pagination Contract (CORE-4)', () => {
  let app: Solarch
  let tempDir: string
  let testCollection: Collection

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-pag-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    testCollection = new Collection({
      name: 'pag_items',
      type: 'base',
      listRule: '',
      viewRule: '',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'orderIndex', type: 'number' },
      ],
    })
    await app.save(testCollection)

    // Insert 5 test records
    for (let i = 1; i <= 5; i++) {
      await app.save(new PBRecord(testCollection.id, testCollection.name, {
        title: `Item ${i}`,
        orderIndex: i,
      }))
    }
  })

  afterAll(async () => {
    if (app) await app.db().close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('calculates totalPages accurately according to formula', () => {
    expect(calculateTotalPages(0, 30)).toBe(1)
    expect(calculateTotalPages(5, 30)).toBe(1)
    expect(calculateTotalPages(30, 30)).toBe(1)
    expect(calculateTotalPages(31, 30)).toBe(2)
    expect(calculateTotalPages(100, 20)).toBe(5)
  })

  it('clamps invalid, negative, or decimal pagination inputs safely', () => {
    expect(parsePagination({ page: '-5', perPage: '0' })).toEqual({
      page: DEFAULT_PAGE,
      perPage: DEFAULT_PER_PAGE,
    })

    expect(parsePagination({ page: '2.9', perPage: '50.5' })).toEqual({
      page: 2,
      perPage: 50,
    })

    expect(parsePagination({ page: '999999', perPage: '999999' })).toEqual({
      page: MAX_PAGE,
      perPage: MAX_PER_PAGE,
    })
  })

  it('returns items correctly for standard page slice', async () => {
    const result = await findAllRecords(app, testCollection.id, { page: 1, perPage: 2 })
    expect(result.page).toBe(1)
    expect(result.perPage).toBe(2)
    expect(result.totalItems).toBe(5)
    expect(result.totalPages).toBe(3)
    expect(result.items).toHaveLength(2)
  })

  it('handles page beyond total pages gracefully with empty items array', async () => {
    const result = await findAllRecords(app, testCollection.id, { page: 99, perPage: 2 })
    expect(result.page).toBe(99)
    expect(result.totalItems).toBe(5)
    expect(result.totalPages).toBe(3)
    expect(result.items).toHaveLength(0)
  })

  it('handles empty collection queries with totalPages = 1 and empty items', async () => {
    const emptyCollection = new Collection({
      name: 'empty_col',
      type: 'base',
      listRule: '',
      fields: [{ name: 'name', type: 'text' }],
    })
    await app.save(emptyCollection)

    const result = await findAllRecords(app, emptyCollection.id, { page: 1, perPage: 30 })
    expect(result.totalItems).toBe(0)
    expect(result.totalPages).toBe(1)
    expect(result.items).toHaveLength(0)
  })
})
