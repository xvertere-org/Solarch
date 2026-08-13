import { Pool, neon, NeonQueryFunction, types as neonTypes } from '@neondatabase/serverless'
import { Pool as PgPool, types as pgTypes } from 'pg'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { Row } from '../types'
import { mapPgError } from './errors'
import { translatePlaceholders } from './translate'

// NOTE: int8 (oid 20) and numeric (oid 1700) are parsed as strings by both
// pg and @neondatabase/serverless; Solarch expects numbers (COUNT, bigint ids).
// Register on both type registries — the neon ws client consults its own.
pgTypes.setTypeParser(20, v => Number(v))
pgTypes.setTypeParser(1700, v => Number(v))
neonTypes.setTypeParser(20, v => Number(v))
neonTypes.setTypeParser(1700, v => Number(v))

export interface QueryOutcome {
  rows: Row[]
  changes: number
}

export type StrategyQuery = (text: string, params?: unknown[]) => Promise<QueryOutcome>

export interface ConnectionStrategy {
  readonly mode: 'tcp' | 'http' | 'websocket'
  readonly supportsTransactions: boolean
  query(text: string, params?: unknown[]): Promise<QueryOutcome>
  exec(text: string): Promise<void>
  transaction<T>(fn: (query: StrategyQuery) => Promise<T>): Promise<T>
  ping(): Promise<boolean>
  close(): Promise<void>
}

function changesFor(command: string, rowCount: number | null): number {
  return ['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(command) ? (rowCount ?? 0) : 0
}

export class StandardPostgresConnection implements ConnectionStrategy {
  readonly mode = 'tcp' as const
  readonly supportsTransactions = true

  private pool: PgPool
  private closed = false

  constructor(
    connectionString: string,
    options?: { max?: number; idleTimeoutMs?: number; connectionTimeoutMs?: number; queryTimeoutMs?: number },
  ) {
    this.pool = new PgPool({
      connectionString,
      max: options?.max ?? 10,
      idleTimeoutMillis: options?.idleTimeoutMs ?? 30_000,
      connectionTimeoutMillis: options?.connectionTimeoutMs ?? 5_000,
      query_timeout: options?.queryTimeoutMs,
    })
  }

  async query(text: string, params?: unknown[]): Promise<QueryOutcome> {
    const [sql, values] = [translatePlaceholders(text), params ?? []]
    const result = await this.pool.query(sql, values)
    return { rows: result.rows as Row[], changes: changesFor(result.command, result.rowCount) }
  }

  async exec(text: string): Promise<void> {
    await this.pool.query(text)
  }

  async transaction<T>(fn: (query: StrategyQuery) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(async (text, params) => {
        const [sql, values] = [translatePlaceholders(text), params ?? []]
        const r = await client.query(sql, values)
        return { rows: r.rows as Row[], changes: changesFor(r.command, r.rowCount) }
      })
      await client.query('COMMIT')
      return result
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch { /* connection may be gone; original error takes precedence */ }
      throw err
    } finally {
      client.release()
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1')
      return true
    } catch { return false }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.pool.end()
  }
}

export class NeonConnection implements ConnectionStrategy {
  readonly supportsTransactions: boolean

  private neonQuery?: NeonQueryFunction<false, false>
  private pool?: Pool
  private closed = false

  constructor(
    connectionString: string,
    mode: 'http' | 'websocket',
    options?: { max?: number; idleTimeoutMs?: number; connectionTimeoutMs?: number; queryTimeoutMs?: number },
  ) {
    this.supportsTransactions = mode === 'websocket'
    if (mode === 'http') {
      this.neonQuery = neon(connectionString)
    } else {
this.pool = new Pool({
        connectionString,
        max: options?.max ?? 10,
        idleTimeoutMillis: options?.idleTimeoutMs ?? 30_000,
        connectionTimeoutMillis: options?.connectionTimeoutMs ?? 15_000,
      })
    }
  }

  get mode(): 'tcp' | 'http' | 'websocket' {
    return this.neonQuery ? 'http' : 'websocket'
  }

  async query(text: string, params?: unknown[]): Promise<QueryOutcome> {
    try {
      if (this.neonQuery) {
        const result = await this.neonQuery.query(text, params ?? [])
        return { rows: result as Row[], changes: 0 }
      }
      const [sql, values] = [translatePlaceholders(text), params ?? []]
      const result = await this.pool!.query(sql, values)
      return { rows: result.rows as Row[], changes: changesFor(result.command, result.rowCount) }
    } catch (err) {
      throw mapPgError(err, 'query')
    }
  }

  async exec(text: string): Promise<void> {
    try {
      if (this.neonQuery) {
        await this.neonQuery.query(text)
        return
      }
      await this.pool!.query(text)
    } catch (err) {
      throw mapPgError(err, 'exec')
    }
  }

  async transaction<T>(fn: (query: StrategyQuery) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_TRANSACTION_FAILED,
        'Neon HTTP mode does not support transactions. Use mode "websocket" for db.transaction().',
      )
    }
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(async (text, params) => {
        const [sql, values] = [translatePlaceholders(text), params ?? []]
        const r = await client.query(sql, values)
        return { rows: r.rows as Row[], changes: changesFor(r.command, r.rowCount) }
      })
      await client.query('COMMIT')
      return result
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch { /* connection may be gone; original error takes precedence */ }
      throw err
    } finally {
      client.release()
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (this.neonQuery) {
        await this.neonQuery.query("SELECT 1")
        return true
      }
      await this.pool!.query('SELECT 1')
      return true
    } catch { return false }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    if (this.pool) await this.pool.end()
  }
}