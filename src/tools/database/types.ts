import { FilterAST } from '../search/filter'

export type DatabaseProviderType = 'sqlite' | 'postgres' | 'mongodb'

/**
 * PostgreSQL connection configuration. `provider` stays `'postgres'` for
 * both direct PostgreSQL (`driver: 'postgres'`, mode `'tcp'`) and Neon
 * (`driver: 'neon'`, mode `'http'` | `'websocket'`). The connection string
 * is a secret: never log it, serialize it into diagnostics, or expose it.
 */
export interface PostgresConnectionConfig {
  provider: 'postgres'
  connectionString: string
  driver?: 'postgres' | 'neon'
  mode?: 'tcp' | 'http' | 'websocket'
  queryTimeout?: number
  pool?: {
    max?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
  }
}

export interface MongoConnectionConfig {
  provider: 'mongodb'
  connectionString: string
  database?: string
  queryTimeout?: number
  pool?: {
    max?: number
    min?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
  }
}

export interface Row {
  [key: string]: any
}

/**
 * SQLite-specific synchronous prepared statement (better-sqlite3 shaped).
 * Not part of the shared driver contract; PostgreSQL has no sync equivalent.
 */
export interface Statement {
  run(...params: any[]): any
  get(...params: any[]): Row | undefined
  all(...params: any[]): Row[]
}

export interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  primaryKey: boolean
  defaultValue?: any
}

export interface ColumnDef {
  name: string
  type: string
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  default?: any
}

export interface DatabaseQuery {
  text: string
  params: unknown[]
}

export interface ExecuteResult {
  changes: number
  rowsAffected: number
  lastInsertRowid?: number | bigint
}

export interface DatabaseHealth {
  ok: boolean
  provider: DatabaseProviderType
  latencyMs: number
  error?: string
}

export interface DatabaseCapabilities {
  transactions: boolean
  joins: boolean
  indexes: boolean
  views: boolean
  foreignKeys: boolean
  jsonOperations: boolean
  migrations: boolean
  vectorFunctions: boolean
  explainOpcodes: boolean
}

/**
 * Query contract. SQL text uses positional `?` placeholders; params are
 * supplied positionally. Each driver translates to its native placeholder
 * style internally (SQLite: `?`; PostgreSQL: `$n`).
 */
export interface QueryDriver {
  query(sql: string, params?: unknown[]): Promise<Row[]>
  queryOne(sql: string, params?: unknown[]): Promise<Row | null>
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>
}

export interface SchemaDriver {
  hasTable(table: string): Promise<boolean>
  tableInfo(table: string): Promise<ColumnInfo[]>
  tableIndexes(table: string): Promise<Record<string, string>>
  createTable(name: string, columns: ColumnDef[]): Promise<void>
  addColumn(table: string, column: ColumnDef): Promise<void>
  dropColumn(table: string, column: string): Promise<void>
  dropTable(table: string): Promise<void>
  dropView(view: string): Promise<void>
  saveView(name: string, selectQuery: string): Promise<void>
  createIndex(table: string, name: string, columns: string[]): Promise<void>
  dropIndex(name: string): Promise<void>
}

export interface TransactionDriver {
  transaction<T>(fn: () => Promise<T>): Promise<T>
}

export interface DatabaseBackupDriver {
  checkpoint(target?: string): Promise<void>
  backupToFile(destPath: string, target?: string): Promise<void>
}

/**
 * Provider-neutral SQL dialect. Each driver exposes its own dialect
 * implementation so the app compiles filters/sorts through the driver
 * rather than hardwiring a provider-specific query builder.
 */
export interface Dialect {
  getDialect(): string
  compileFilter(ast: FilterAST, prefix?: string, offset?: number): DatabaseQuery
  buildSort(sort: string): string
  escapeField(field: string): string
}

export interface DatabaseDriver extends QueryDriver, SchemaDriver, TransactionDriver, Dialect {
  provider: DatabaseProviderType
  capabilities: DatabaseCapabilities
  connect(): Promise<void>
  close(): Promise<void>
  exec(sql: string): Promise<void>
  ping(): Promise<boolean>
}