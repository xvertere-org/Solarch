import { describe, it, expect } from 'vitest'
import { normalizeDocument, normalizeValue, prepareDocumentForInsert } from '../mapping'

describe('MongoDB BSON Canonicalization & Egress Normalization (DB-MONGO-16.5)', () => {
  it('strips _id and preserves top-level id in document normalization', () => {
    const rawMongoDoc = {
      _id: { _bsontype: 'ObjectId', toHexString: () => '64b0f9c2e4b0a1a2b3c4d5e6' },
      id: 'abc123xyz456789',
      name: 'Test Article',
      status: 'published',
    }

    const normalized = normalizeDocument(rawMongoDoc)
    expect(normalized).toEqual({
      id: 'abc123xyz456789',
      name: 'Test Article',
      status: 'published',
    })
    expect('_id' in normalized).toBe(false)
  })

  it('maps _id to id if top-level id is absent', () => {
    const rawMongoDoc = {
      _id: { _bsontype: 'ObjectId', toHexString: () => '64b0f9c2e4b0a1a2b3c4d5e6' },
      title: 'Legacy Document',
    }

    const normalized = normalizeDocument(rawMongoDoc)
    expect(normalized.id).toBe('64b0f9c2e4b0a1a2b3c4d5e6')
    expect('_id' in normalized).toBe(false)
  })

  it('canonicalizes BSON types (Decimal128, Long, Timestamp, Date)', () => {
    const date = new Date('2026-08-14T12:00:00.000Z')
    const rawMongoDoc = {
      id: 'rec_1',
      price: { _bsontype: 'Decimal128', toString: () => '99.99' },
      counter: { _bsontype: 'Long', toString: () => '9007199254740992' },
      created: date,
      nested: {
        _id: 'secret_nested_id',
        score: 100,
        subDocId: { _bsontype: 'ObjectId', toHexString: () => '507f1f77bcf86cd799439011' },
      },
      tags: ['tag1', { _bsontype: 'ObjectId', toHexString: () => '507f191e810c19729de860ea' }],
    }

    const normalized = normalizeDocument(rawMongoDoc)
    expect(normalized).toEqual({
      id: 'rec_1',
      price: '99.99',
      counter: '9007199254740992',
      created: '2026-08-14 12:00:00',
      nested: {
        score: 100,
        subDocId: '507f1f77bcf86cd799439011',
      },
      tags: ['tag1', '507f191e810c19729de860ea'],
    })
  })

  it('prepares document for insert correctly without undefined or _id', () => {
    const insertInput = {
      id: 'new_rec_123',
      _id: 'should_be_stripped',
      title: 'Valid Document',
      extra: undefined,
      count: 42,
    }

    const prepared = prepareDocumentForInsert(insertInput)
    expect(prepared).toEqual({
      id: 'new_rec_123',
      title: 'Valid Document',
      count: 42,
    })
    expect('_id' in prepared).toBe(false)
    expect('extra' in prepared).toBe(false)
  })
})
