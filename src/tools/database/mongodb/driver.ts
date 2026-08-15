import {
  DatabaseDriver,
  DatabaseProviderType,
  DatabaseCapabilities,
  MongoConnectionConfig,
  Row,
  ExecuteResult,
  ColumnDef,
  ColumnInfo,
  DatabaseQuery,
} from '../types'
import { FilterAST } from '../../search/filter'
import { MONGODB_CAPABILITIES } from '../capabilities'
import { MongoConnection } from './connection'
import { MongoQueryExecutor } from './query'
import { MongoSchemaManager } from './schema'
import { MongoTransactionManager } from './transaction'
import { MongoDialect } from './dialect'

export class MongoDBDriver implements DatabaseDriver {
  readonly provider: DatabaseProviderType = 'mongodb'
  readonly capabilities: DatabaseCapabilities = MONGODB_CAPABILITIES

  private conn: MongoConnection
  private queryExec: MongoQueryExecutor
  private schemaMgr: MongoSchemaManager
  private txMgr: MongoTransactionManager
  private dialect: MongoDialect

  constructor(config: MongoConnectionConfig) {
    this.conn = new MongoConnection(config)
    this.queryExec = new MongoQueryExecutor(this.conn)
    this.schemaMgr = new MongoSchemaManager(this.conn)
    this.txMgr = new MongoTransactionManager(this.conn)
    this.dialect = new MongoDialect()
  }

  async connect(): Promise<void> {
    await this.conn.connect()
  }

  async close(): Promise<void> {
    await this.conn.close()
  }

  async ping(): Promise<boolean> {
    return this.conn.ping()
  }

  async exec(sql: string): Promise<void> {
    const trimmed = sql.trim()
    const match = trimmed.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)(?:\s*\((.*)\))?$/i)
    if (match) {
      const name = match[1].replace(/["`'\[\]]/g, '')
      const colsDef = match[2]
      const columns: ColumnDef[] = []
      if (colsDef) {
        const colParts = colsDef.split(',').map(s => s.trim())
        for (const part of colParts) {
          const tokens = part.split(/\s+/)
          const colName = tokens[0].replace(/["`'\[\]]/g, '')
          const colType = tokens[1] || 'TEXT'
          const isPk = /PRIMARY\s+KEY/i.test(part)
          const notNull = /NOT\s+NULL/i.test(part)
          columns.push({ name: colName, type: colType, primaryKey: isPk, notNull })
        }
      }
      await this.schemaMgr.createTable(name, columns)
    }
  }

  // --- QueryDriver ---
  async query(sql: string, params?: unknown[]): Promise<Row[]> {
    return this.queryExec.query(sql, params)
  }

  async queryOne(sql: string, params?: unknown[]): Promise<Row | null> {
    return this.queryExec.queryOne(sql, params)
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    return this.queryExec.execute(sql, params)
  }

  // --- SchemaDriver ---
  async hasTable(table: string): Promise<boolean> {
    return this.schemaMgr.hasTable(table)
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    return this.schemaMgr.tableInfo(table)
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    return this.schemaMgr.tableIndexes(table)
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    return this.schemaMgr.createTable(name, columns)
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    return this.schemaMgr.addColumn(table, column)
  }

  async dropColumn(table: string, column: string): Promise<void> {
    return this.schemaMgr.dropColumn(table, column)
  }

  async dropTable(table: string): Promise<void> {
    return this.schemaMgr.dropTable(table)
  }

  async dropView(view: string): Promise<void> {
    return this.schemaMgr.dropView(view)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    return this.schemaMgr.saveView(name, selectQuery)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    return this.schemaMgr.createIndex(table, name, columns)
  }

  async dropIndex(name: string): Promise<void> {
    return this.schemaMgr.dropIndex(name)
  }

  // --- TransactionDriver ---
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.txMgr.transaction(fn)
  }

  // --- Dialect ---
  getDialect(): string {
    return this.dialect.getDialect()
  }

  compileFilter(ast: FilterAST, prefix?: string, offset?: number): DatabaseQuery {
    return this.dialect.compileFilter(ast, prefix, offset)
  }

  buildSort(sort: string): string {
    return this.dialect.buildSort(sort)
  }

  escapeField(field: string): string {
    return this.dialect.escapeField(field)
  }
}
