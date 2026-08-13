import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../solarch.js'
import { Collection } from '../collection.js'
import { RecordModel as PBRecord } from '../record.js'
import { findAllRecords, findFirstRecordByFilter, vectorSearch, countRecords } from '../record_query.js'
import { createRecordTable } from '../schema_sync.js'

const connectionString = process.env.PG_TEST_CONNECTION_STRING

describe.skipIf(!connectionString)('Solarch application on PostgreSQL (DB-PG-16)', () => {
  let app: Solarch
  let posts: Collection

  beforeAll(async () => {
    process.env.JWT_SECRET = 'd'.repeat(32)
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: true,
      dbProvider: 'postgres',
      connectionString,
    })
    await app.bootstrap()
    await app.migrate()

    posts = new Collection({
      name: 'posts',
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'views', type: 'number' },
        { name: 'published', type: 'bool' },
        { name: 'tags', type: 'json' },
      ],
      indexes: [],
    })
    await app.save(posts)
  })

  afterAll(async () => {
    if (app) await app.resetBootstrapState()
  })

  it('boots the app and applies system and user migrations on postgres', async () => {
    expect(await app.db().hasTable('_collections')).toBe(true)
    expect(await app.db().hasTable('_settings')).toBe(true)
    expect(await app.db().hasTable('_migrations')).toBe(true)
    expect(await app.db().hasTable('_applied_migrations')).toBe(true)
    expect(await app.db().hasTable('_logs')).toBe(true)
    expect(await app.db().hasTable('_mfas')).toBe(true)
    expect(await app.db().hasTable('_otps')).toBe(true)
    expect(await app.db().hasTable('_authOrigins')).toBe(true)
    expect(await app.db().hasTable('_externalAuths')).toBe(true)
    expect(await app.db().hasTable('_tokenRevocations')).toBe(true)
    expect(await app.db().getDriver().getDialect()).toBe('postgres')
  })

  it('fails fast on unreachable postgres without running migrations', async () => {
    const deadApp = new Solarch({
      hideStartBanner: true,
      defaultDev: true,
      dbProvider: 'postgres',
      connectionString: 'postgres://invalid:pass@127.0.0.1:54329/dead_db',
    })
    await expect(deadApp.bootstrap()).rejects.toThrow(/Could not connect to PostgreSQL|Database is unreachable/)
    expect(deadApp.isBootstrapped()).toBe(false)
  })

  it('resolves postgres from DATABASE_URL when not explicitly configured', async () => {
    const previous = process.env.DATABASE_URL
    process.env.DATABASE_URL = connectionString!
    try {
      const inferred = new Solarch({ hideStartBanner: true, defaultDev: true })
      expect(inferred.dbProvider).toBe('postgres')
      expect(inferred.connectionString).toBe(connectionString)
      await inferred.bootstrap()
      expect(await inferred.db().hasTable('_collections')).toBe(true)
      await inferred.resetBootstrapState()
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = previous
    }
  })

  it('creates records and queries them with filters, sort and pagination', async () => {
    for (const [title, views, published, tags] of [
      ['first', 100, true, ['news', 'tech']],
      ['second', 50, true, ['news']],
      ['third', 5, false, ['misc']],
      ['fourth', 75, true, ['tech']],
    ] as const) {
      await app.save(new PBRecord(posts.id, 'posts', {
        title,
        views,
        published,
        tags: JSON.stringify(tags),
      }))
    }

    const page = await findAllRecords(app, 'posts', { filter: 'views >= 10', sort: '-views', page: 1, perPage: 2 })
    expect(page.totalItems).toBe(3)
    expect(page.totalPages).toBe(2)
    expect(page.items).toHaveLength(2)
    expect(page.items[0].get('title')).toBe('first')
    expect(page.items[1].get('title')).toBe('fourth')

    const page2 = await findAllRecords(app, 'posts', { filter: 'views >= 10', sort: '-views', page: 2, perPage: 2 })
    expect(page2.items.map(r => r.get('title'))).toEqual(['second'])

    const first = await findFirstRecordByFilter(app, 'posts', 'published = true AND title = "first"')
    expect(first?.get('views')).toBe(100)

    expect(await countRecords(app, 'posts', 'views >= 50')).toBe(3)
  })

  it('executes json array operators through the postgres dialect', async () => {
    const page = await findAllRecords(app, 'posts', { filter: 'tags ?= "tech"' })
    expect(page.totalItems).toBe(2)

    const like = await findAllRecords(app, 'posts', { filter: 'tags ?: "ne"' })
    expect(like.totalItems).toBe(2)
  })

  it('syncs view collections via schema_sync (explainOpcodes gate)', async () => {
    const view = new Collection({
      name: 'high_views',
      type: 'view',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [],
      indexes: [],
      viewOptions: { query: `SELECT * FROM _r_${posts.id} WHERE views >= 50` },
    })
    await app.save(view)
    await createRecordTable(app, view)
    expect(await app.db().hasTable(`_r_${view.id}`)).toBe(true)

    const rows = await app.db().query(`SELECT * FROM _r_${view.id}`)
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects multi-statement view queries (provider-neutral guard)', async () => {
    const evil = new Collection({
      name: 'evil_view',
      type: 'view',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [],
      indexes: [],
      viewOptions: { query: `SELECT 1; DROP TABLE _r_${posts.id}` },
    })
    await app.save(evil)
    await createRecordTable(app, evil)
    expect(await app.db().hasTable(`_r_${evil.id}`)).toBe(false)
  })

  it('vector search degrades loudly via capability gate', async () => {
    await expect(vectorSearch(app, 'posts', 'title', [1, 0, 1])).rejects.toThrow(/not supported/)
  })

  it('supports transactions through the app facade', async () => {
    await app.db().transaction(async () => {
      await app.save(new PBRecord(posts.id, 'posts', { title: 'tx', views: 1, published: false, tags: '[]' }))
      throw new Error('rollback-me')
    }).catch(() => { })
    const found = await findAllRecords(app, 'posts', { filter: 'title = "tx"' })
    expect(found.totalItems).toBe(0)
  })

  it('runs migrations and records applied state', async () => {
    const status = await app.migrationStatus()
    expect(Array.isArray(status)).toBe(true)
  })
})