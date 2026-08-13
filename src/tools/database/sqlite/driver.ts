import Database from 'better-sqlite3'
import {
  DatabaseDriver,
  DatabaseProviderType,
  DatabaseCapabilities,
  DatabaseQuery,
  ExecuteResult,
  Row,
  Statement,
} from '../types'
import { SQLiteConnection } from './connection'
import { SQLiteSchemaDriver } from './schema'
import { SQLiteTransactionDriver } from './transaction'
import { SQLiteBackupDriver } from './backup'
import { SQLiteDialect } from './dialect'
import { SQLITE_CAPABILITIES } from '../capabilities'
import { DatabaseError, DatabaseErrorCode } from '../errors'

export class SqliteDriver implements DatabaseDriver {
  readonly provider: DatabaseProviderType = 'sqlite'
  readonly capabilities: DatabaseCapabilities = SQLITE_CAPABILITIES

  private connection: SQLiteConnection
  private schemaDriver: SQLiteSchemaDriver
  private transactionDriver: SQLiteTransactionDriver
  private backupDriver: SQLiteBackupDriver
  private dialect = new SQLiteDialect()

  constructor(dataDir: string, queryTimeout = 30) {
    this.connection = new SQLiteConnection(dataDir, queryTimeout)
    this.schemaDriver = new SQLiteSchemaDriver(this.connection.dataDB)
    this.transactionDriver = new SQLiteTransactionDriver(this.connection.dataDB)
    this.backupDriver = new SQLiteBackupDriver(this.connection.dataDB, this.connection.auxDB)
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

  async connect(): Promise<void> { }

  async close(): Promise<void> {
    this.connection.close()
  }

  async exec(sql: string): Promise<void> {
    try {
      this.connection.dataDB.exec(sql)
    } catch (err) {
      throw this.mapError(err, 'exec')
    }
  }

  prepare(sql: string): Statement {
    return this.connection.dataDB.prepare(sql) as unknown as Statement
  }

  async query(sql: string, params?: unknown[]): Promise<Row[]> {
    try {
      const stmt = this.connection.dataDB.prepare(sql)
      return (params ? stmt.all(...params) : stmt.all()) as Row[]
    } catch (err) {
      throw this.mapError(err, 'query')
    }
  }

  async queryOne(sql: string, params?: unknown[]): Promise<Row | null> {
    try {
      const stmt = this.connection.dataDB.prepare(sql)
      const row = (params ? stmt.get(...params) : stmt.get()) as Row | undefined
      return row ?? null
    } catch (err) {
      throw this.mapError(err, 'queryOne')
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    try {
      const stmt = this.connection.dataDB.prepare(sql)
      const result = params ? stmt.run(...params) : stmt.run()
      return { changes: result.changes, rowsAffected: result.changes, lastInsertRowid: result.lastInsertRowid }
    } catch (err) {
      throw this.mapError(err, 'execute')
    }
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
    return this.transactionDriver.transaction(fn)
  }

  async checkpoint(db: 'data' | 'aux'): Promise<void> {
    return this.backupDriver.checkpoint(db)
  }

  async backupToFile(db: 'data' | 'aux', destPath: string): Promise<void> {
    return this.backupDriver.backupToFile(db, destPath)
  }

  async ping(): Promise<boolean> {
    try {
      this.connection.dataDB.exec('SELECT 1')
      return true
    } catch { return false }
  }

  getDataDB(): Database.Database {
    return this.connection.dataDB
  }

  getAuxDB(): Database.Database {
    return this.connection.auxDB
  }

  private mapError(err: unknown, operation: string): DatabaseError {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('database is locked') || message.includes('busy')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_TIMEOUT, `${operation}: ${message}`, { retryable: true, cause: err })
    }
    if (message.includes('no such table') || message.includes('no such column')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_SCHEMA_ERROR, `${operation}: ${message}`, { cause: err })
    }
    if (message.includes('constraint')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_CONSTRAINT, `${operation}: ${message}`, { cause: err })
    }
    if (message.includes('syntax error')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_INVALID_QUERY, `${operation}: ${message}`, { cause: err })
    }
    return new DatabaseError(DatabaseErrorCode.DATABASE_UNAVAILABLE, `${operation}: ${message}`, { retryable: true, cause: err })
  }
}