import { describe, it, expect } from 'vitest'
import { DatabaseStrategy } from '../database'

describe('DatabaseStrategy Contract (Phase 0)', () => {
  it('creates SQLite strategy with default single-node WAL topology', () => {
    const db = new DatabaseStrategy({ engine: 'sqlite' })
    expect(db.engine).toBe('sqlite')
    expect(db.topology).toBe('sqlite_only')
    expect(db.hasVector()).toBe(false)
    expect(db.isHybrid()).toBe(false)
    expect(db.source).toBe('default')
  })

  it('supports PostgreSQL with pgvector capability for AI applications', () => {
    const db = new DatabaseStrategy({
      engine: 'postgres',
      topology: 'postgres_only',
      capabilities: { vector: true },
      source: 'recommendation',
    })
    expect(db.engine).toBe('postgres')
    expect(db.hasVector()).toBe(true)
    expect(db.topology).toBe('postgres_only')
    expect(db.source).toBe('recommendation')
  })

  it('supports MongoDB strategy', () => {
    const db = new DatabaseStrategy({
      engine: 'mongodb',
      source: 'user',
    })
    expect(db.engine).toBe('mongodb')
    expect(db.topology).toBe('mongodb_only')
    expect(db.source).toBe('user')
  })

  it('supports local SQLite + cloud PostgreSQL hybrid topology', () => {
    const db = new DatabaseStrategy({
      engine: 'postgres',
      topology: 'sqlite_local_postgres_cloud',
      source: 'recommendation',
    })
    expect(db.engine).toBe('postgres')
    expect(db.topology).toBe('sqlite_local_postgres_cloud')
    expect(db.isHybrid()).toBe(true)
  })

  it('strictly rejects connection strings, credentials, and passwords', () => {
    expect(() => {
      new DatabaseStrategy({
        engine: 'postgres',
        // @ts-expect-error - testing credential rejection invariant
        password: 'db_password_123',
      })
    }).toThrow(/credentials or connection URLs are strictly forbidden/)

    expect(() => {
      new DatabaseStrategy({
        engine: 'postgres',
        // @ts-expect-error - testing connection URL rejection invariant
        url: 'postgres://user:pass@localhost:5432/app',
      })
    }).toThrow(/credentials or connection URLs are strictly forbidden/)
  })
})
