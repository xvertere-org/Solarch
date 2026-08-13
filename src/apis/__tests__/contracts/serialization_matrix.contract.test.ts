import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { Collection } from '../../../core/collection'
import { RecordModel as PBRecord } from '../../../core/record'
import { enrichRecord } from '../../record_helpers'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Canonical Serialization Matrix (CORE-5)', () => {
  let app: Solarch
  let tempDir: string
  let fullCollection: Collection

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-ser-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    fullCollection = new Collection({
      name: 'all_field_types',
      type: 'base',
      listRule: '',
      viewRule: '',
      fields: [
        { name: 'textVal', type: 'text' },
        { name: 'numberVal', type: 'number' },
        { name: 'boolVal', type: 'bool' },
        { name: 'emailVal', type: 'email' },
        { name: 'urlVal', type: 'url' },
        { name: 'dateVal', type: 'date' },
        { name: 'selectVal', type: 'select', values: ['opt1', 'opt2'] },
        { name: 'jsonVal', type: 'json' },
        { name: 'geoVal', type: 'geoPoint' },
        { name: 'vecVal', type: 'vector', dimensions: 3 },
      ],
    })
    await app.save(fullCollection)
  })

  afterAll(async () => {
    if (app) await app.db().close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('serializes all 14 field types into clean JSON primitives', async () => {
    const rawData = {
      textVal: 'Hello Solarch',
      numberVal: 42,
      boolVal: true,
      emailVal: 'test@example.com',
      urlVal: 'https://solarch.dev',
      dateVal: '2026-08-14T00:00:00.000Z',
      selectVal: 'opt1',
      jsonVal: { nested: { key: 'value' }, arr: [1, 2, 3] },
      geoVal: { lat: 37.7749, lng: -122.4194 },
      vecVal: [0.1, 0.2, 0.3],
    }

    const record = new PBRecord(fullCollection.id, fullCollection.name, rawData)
    await app.save(record)

    const json = record.toJSON()

    // Assert system fields
    expect(json.id).toBe(record.id)
    expect(typeof json.created).toBe('string')
    expect(typeof json.updated).toBe('string')
    expect(json.collectionId).toBe(fullCollection.id)
    expect(json.collectionName).toBe(fullCollection.name)

    // Assert field types
    expect(json.textVal).toBe('Hello Solarch')
    expect(json.numberVal).toBe(42)
    expect(json.boolVal).toBe(true)
    expect(json.emailVal).toBe('test@example.com')
    expect(json.urlVal).toBe('https://solarch.dev')
    expect(json.selectVal).toBe('opt1')
    expect(json.jsonVal).toEqual({ nested: { key: 'value' }, arr: [1, 2, 3] })
    expect(json.geoVal).toEqual({ lat: 37.7749, lng: -122.4194 })
    expect(json.vecVal).toEqual([0.1, 0.2, 0.3])
  })

  it('strictly hides sensitive security fields during enrichment and JSON serialization', async () => {
    const authCollection = new Collection({
      name: 'members',
      type: 'auth',
      listRule: '',
      viewRule: '',
      fields: [
        { name: 'name', type: 'text' },
      ],
    })
    await app.save(authCollection)

    const authRecord = new PBRecord(authCollection.id, authCollection.name, {
      name: 'Alice',
      email: 'alice@example.com',
      emailVisibility: false,
      passwordHash: 'argon2id$hashedpassword',
      lastResetSentAt: '2026-08-01T00:00:00.000Z',
    })

    const enriched = await enrichRecord(app, authCollection, authRecord, {
      requestInfo: {
        auth: null,
        isAdmin: false,
        method: 'GET',
        headers: {},
        query: {},
        body: {},
        data: {},
        context: 'view',
      },
    })

    const json = enriched.toJSON()
    expect(json).not.toHaveProperty('passwordHash')
    expect(json).not.toHaveProperty('lastResetSentAt')
    expect(json).not.toHaveProperty('email') // emailVisibility is false and non-admin
  })
})
