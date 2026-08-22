import { describe, it, expect } from 'vitest'
import { DatabaseCompatibility } from '../database/compatibility.js'

describe('Database Compatibility Matrix (Phase 6)', () => {
  it('1. validates valid combinations across SQLite, PostgreSQL, MongoDB', () => {
    // SQLite
    expect(DatabaseCompatibility.validate('sqlite', 'local', 'standalone').compatible).toBe(true)

    // PostgreSQL
    expect(DatabaseCompatibility.validate('postgres', 'local', 'standalone').compatible).toBe(true)
    expect(DatabaseCompatibility.validate('postgres', 'neon', 'serverless').compatible).toBe(true)
    expect(DatabaseCompatibility.validate('postgres', 'supabase', 'standalone').compatible).toBe(true)
    expect(DatabaseCompatibility.validate('postgres', 'supabase', 'replica').compatible).toBe(true)

    // MongoDB
    expect(DatabaseCompatibility.validate('mongodb', 'atlas', 'replica').compatible).toBe(true)
    expect(DatabaseCompatibility.validate('mongodb', 'atlas', 'sharded').compatible).toBe(true)
    expect(DatabaseCompatibility.validate('mongodb', 'atlas', 'serverless').compatible).toBe(true)
  })

  it('2. rejects invalid or unsupported engine/provider/topology combinations', () => {
    // SQLite cannot use Neon or Replica
    expect(DatabaseCompatibility.validate('sqlite', 'neon', 'serverless').compatible).toBe(false)
    expect(DatabaseCompatibility.validate('sqlite', 'local', 'replica').compatible).toBe(false)

    // PostgreSQL cannot use Atlas
    expect(DatabaseCompatibility.validate('postgres', 'atlas', 'replica').compatible).toBe(false)

    // Neon does not support sharded topology
    expect(DatabaseCompatibility.validate('postgres', 'neon', 'sharded').compatible).toBe(false)
  })

  it('3. returns default provider and topology recommendations', () => {
    expect(DatabaseCompatibility.getDefaultProvider('sqlite')).toBe('local')
    expect(DatabaseCompatibility.getDefaultProvider('postgres')).toBe('neon')
    expect(DatabaseCompatibility.getDefaultProvider('mongodb')).toBe('atlas')

    expect(DatabaseCompatibility.getDefaultTopology('postgres', 'neon')).toBe('serverless')
    expect(DatabaseCompatibility.getDefaultTopology('mongodb', 'atlas')).toBe('replica')
  })
})
