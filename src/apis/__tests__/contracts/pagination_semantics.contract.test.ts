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

  it('HTTP REST list: locked collection (listRule === null) returns totalItems: 0, totalPages: 1, items: []', async () => {
    const { serve } = await import('../../serve')
    const server = await serve(app, 0)
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 8090

    try {
      const lockedCol = new Collection({
        name: 'locked_col',
        type: 'base',
        listRule: null,
        viewRule: null,
        fields: [{ name: 'name', type: 'text' }],
      })
      await app.save(lockedCol)

      await app.save(new PBRecord(lockedCol.id, lockedCol.name, { name: 'Hidden 1' }))
      await app.save(new PBRecord(lockedCol.id, lockedCol.name, { name: 'Hidden 2' }))

      const res = await fetch(`http://127.0.0.1:${port}/api/collections/locked_col/records`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.totalItems).toBe(0)
      expect(body.totalPages).toBe(1)
      expect(body.items).toEqual([])
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it('HTTP REST list: rule-filtered collection ensures totalItems, totalPages, and items describe only authorized records', async () => {
    const { serve } = await import('../../serve')
    const server = await serve(app, 0)
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 8090

    try {
      // 1. Create users auth collection
      const usersCol = new Collection({
        name: 'pag_users',
        type: 'auth',
        listRule: '',
        viewRule: '',
        fields: [],
      })
      await app.save(usersCol)

      const userA = new PBRecord(usersCol.id, usersCol.name, {
        email: 'userA@example.com',
        passwordHash: 'hash',
        verified: 1,
      })
      await app.save(userA)

      const userB = new PBRecord(usersCol.id, usersCol.name, {
        email: 'userB@example.com',
        passwordHash: 'hash',
        verified: 1,
      })
      await app.save(userB)

      const tokenA = app.generateJWT({ id: userA.id, type: 'auth', collectionId: usersCol.id }, app.getJwtSecret(), '1h')

      // 2. Create posts collection with listRule: author = @request.auth.id
      const postsCol = new Collection({
        name: 'pag_posts',
        type: 'base',
        listRule: 'author = @request.auth.id',
        viewRule: 'author = @request.auth.id',
        fields: [
          { name: 'title', type: 'text' },
          { name: 'author', type: 'text' },
        ],
      })
      await app.save(postsCol)

      // 3. User A owns 3 posts, User B owns 4 posts (7 total)
      for (let i = 1; i <= 3; i++) {
        await app.save(new PBRecord(postsCol.id, postsCol.name, { title: `A Post ${i}`, author: userA.id }))
      }
      for (let i = 1; i <= 4; i++) {
        await app.save(new PBRecord(postsCol.id, postsCol.name, { title: `B Post ${i}`, author: userB.id }))
      }

      // Query page 1 with perPage=2 as User A
      const resPage1 = await fetch(`http://127.0.0.1:${port}/api/collections/pag_posts/records?page=1&perPage=2`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      const bodyPage1 = await resPage1.json()

      expect(resPage1.status).toBe(200)
      expect(bodyPage1.totalItems).toBe(3) // Exactly User A's 3 posts, NOT 7!
      expect(bodyPage1.totalPages).toBe(2)
      expect(bodyPage1.items).toHaveLength(2)
      expect(bodyPage1.items.every((it: any) => it.author === userA.id)).toBe(true)

      // Query page 2 with perPage=2 as User A
      const resPage2 = await fetch(`http://127.0.0.1:${port}/api/collections/pag_posts/records?page=2&perPage=2`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      const bodyPage2 = await resPage2.json()

      expect(resPage2.status).toBe(200)
      expect(bodyPage2.totalItems).toBe(3)
      expect(bodyPage2.totalPages).toBe(2)
      expect(bodyPage2.items).toHaveLength(1)
      expect(bodyPage2.items[0].author).toBe(userA.id)
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
