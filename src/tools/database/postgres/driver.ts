import { DatabaseDriver, DatabaseCapabilities, PostgresConnectionConfig, Row, ExecuteResult, DatabaseQuery } from '../types'
import { POSTGRES_CAPABILITIES } from '../capabilities'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { AsyncLocalStorage } from 'node:async_hooks'
import { ConnectionStrategy, StrategyQuery, StandardPostgresConnection, NeonConnection } from './connection'
import { PostgresSchemaDriver } from './schema'
import { PostgresDialect } from './dialect'
import { mapPgError } from './errors'
import { translatePlaceholders } from './translate'

const txContext = new AsyncLocalStorage<StrategyQuery>()

export class PostgresDriver implements DatabaseDriver {
  readonly provider = 'postgres' as const
  readonly capabilities: DatabaseCapabilities = POSTGRES_CAPABILITIES

  private readonly dialect = new PostgresDialect()
  private readonly schemaDriver: PostgresSchemaDriver
  private readonly strategy: ConnectionStrategy

  constructor(config: PostgresConnectionConfig) {
    if (!config.connectionString || !config.connectionString.trim()) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        'PostgreSQL requires a non-empty connectionString. Use provider "sqlite" or provide connectionString.',
        { retryable: false },
      )
    }

    const driver = config.driver ?? 'postgres'
    const mode = config.mode ?? (driver === 'postgres' ? 'tcp' : undefined)
    const poolOptions = {
      max: config.pool?.max ?? 10,
      idleTimeoutMs: config.pool?.idleTimeoutMs ?? 30_000,
      connectionTimeoutMs: config.pool?.connectionTimeoutMs ?? 5_000,
      queryTimeoutMs: config.queryTimeout ? config.queryTimeout * 1000 : undefined,
    }

    if (driver === 'postgres') {
      if (mode !== 'tcp') {
        throw new DatabaseError(
          DatabaseErrorCode.DATABASE_UNAVAILABLE,
          `driver "postgres" uses mode "tcp"; got mode "${mode}". For Neon, use driver "neon".`,
          { retryable: false },
        )
      }
      this.strategy = new StandardPostgresConnection(config.connectionString, poolOptions)
    } else {
      if (mode !== 'http' && mode !== 'websocket') {
        throw new DatabaseError(
          DatabaseErrorCode.DATABASE_UNAVAILABLE,
          `driver "neon" requires mode "http" or "websocket".`,
          { retryable: false },
        )
      }
      this.strategy = new NeonConnection(config.connectionString, mode, poolOptions)
    }

    this.schemaDriver = new PostgresSchemaDriver(this.strategy, () => txContext.getStore() ?? null)
  }

  getDialect(): string {
    return this.dialect.getDialect()
  }

  compileFilter(ast: any, prefix = '', offset = 0): DatabaseQuery {
    return this.dialect.compileFilter(ast, prefix, offset)
  }

  buildSort(sort: string): string {
    return this.dialect.buildSort(sort)
  }

  escapeField(field: string): string {
    return this.dialect.escapeField(field)
  }

  async connect(): Promise<void> {
    const ok = await this.strategy.ping()
    if (!ok) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        'Could not connect to PostgreSQL. Check connectionString and server availability.',
        { retryable: true },
      )
    }
  }

  async close(): Promise<void> {
    await this.strategy.close()
  }

  async exec(sql: string): Promise<void> {
    try {
      const bound = txContext.getStore()
      if (bound) {
        await bound(sql)
        return
      }
      await this.strategy.exec(sql)
    } catch (err) {
      throw mapPgError(err, 'exec')
    }
  }

  async query(sql: string, params?: unknown[]): Promise<Row[]> {
    try {
      const outcome = await this.runQuery(sql, params)
      return outcome.rows
    } catch (err) {
      throw mapPgError(err, 'query')
    }
  }

  async queryOne(sql: string, params?: unknown[]): Promise<Row | null> {
    try {
      const outcome = await this.runQuery(sql, params)
      return outcome.rows[0] ?? null
    } catch (err) {
      throw mapPgError(err, 'queryOne')
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    try {
      const outcome = await this.runQuery(sql, params)
      return { changes: outcome.changes, rowsAffected: outcome.changes }
    } catch (err) {
      throw mapPgError(err, 'execute')
    }
  }

  private async runQuery(sql: string, params?: unknown[]): Promise<import('./connection').QueryOutcome> {
    const normalized = params?.map(normalizeParam)
    const bound = txContext.getStore()
    if (bound) return bound(translatePlaceholders(sql), normalized)
    return this.strategy.query(translatePlaceholders(sql), normalized)
  }

  async hasTable(table: string): Promise<boolean> {
    return this.schemaDriver.hasTable(table)
  }

  async tableInfo(table: string) {
    return this.schemaDriver.tableInfo(table)
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    return this.schemaDriver.tableIndexes(table)
  }

  async createTable(name: string, columns: any[]): Promise<void> {
    return this.schemaDriver.createTable(name, columns)
  }

  async addColumn(table: string, column: any): Promise<void> {
    return this.schemaDriver.addColumn(table, column)
  }

  async dropColumn(table: string, column: string): Promise<void> {
    return this.schemaDriver.dropColumn(table, column)
  }

  async dropTable(table: string): Promise<void> {
    return this.schemaDriver.dropTable(table)
  }

  async dropView(view: string): Promise<void> {
    return this.schemaDriver.dropView(view)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    return this.schemaDriver.saveView(name, selectQuery)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    return this.schemaDriver.createIndex(table, name, columns)
  }

  async dropIndex(name: string): Promise<void> {
    return this.schemaDriver.dropIndex(name)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (txContext.getStore()) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_TRANSACTION_FAILED,
        'Nested transactions are not supported.',
        { retryable: false },
      )
    }
    try {
      return await this.strategy.transaction(async bound => txContext.run(bound, () => fn()))
    } catch (err) {
      if (err instanceof DatabaseError) throw err
      throw mapPgError(err, 'transaction')
    }
  }

  async ping(): Promise<boolean> {
    return this.strategy.ping()
  }
}

function normalizeParam(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return JSON.stringify(value)
  }
  return value
}