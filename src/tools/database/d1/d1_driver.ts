import {
  DatabaseDriver,
  DatabaseProviderType,
  DatabaseCapabilities,
  DatabaseQuery,
  ExecuteResult,
  Row,
  ColumnInfo,
  ColumnDef,
} from '../types'
import { SQLiteDialect } from '../sqlite/dialect'
import { D1_CAPABILITIES } from '../capabilities'
import { DatabaseError, DatabaseErrorCode } from '../errors'
import { validateIdentifier, quoteIdentifier } from '../../../utils/sql_safe'

export interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement
  all<T = Record<string, any>>(): Promise<{ results?: T[]; success: boolean; error?: string }>
  first<T = Record<string, any>>(): Promise<T | null>
  run(): Promise<{ success: boolean; meta?: { changes?: number; rows_written?: number; last_row_id?: number | bigint }; error?: string }>
}

export interface D1DatabaseBinding {
  prepare(sql: string): D1PreparedStatement
  batch<T = any>(statements: D1PreparedStatement[]): Promise<{ results?: T[]; success: boolean }[]>
  exec(sql: string): Promise<{ count: number; duration: number }>
}

export class D1DatabaseDriver implements DatabaseDriver {
  readonly provider: DatabaseProviderType = 'd1'
  readonly capabilities: DatabaseCapabilities = D1_CAPABILITIES

  private dialect = new SQLiteDialect()

  constructor(private db: D1DatabaseBinding) {}

  getDialect(): string {
    return 'd1'
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

  async connect(): Promise<void> {}

  async close(): Promise<void> {}

  async exec(sql: string): Promise<void> {
    try {
      await this.db.exec(sql)
    } catch (err) {
      throw this.mapError(err, 'exec')
    }
  }

  async query(sql: string, params?: unknown[]): Promise<Row[]> {
    try {
      let stmt = this.db.prepare(sql)
      if (params && params.length > 0) {
        stmt = stmt.bind(...params)
      }
      const result = await stmt.all<Row>()
      return result.results || []
    } catch (err) {
      throw this.mapError(err, 'query')
    }
  }

  async queryOne(sql: string, params?: unknown[]): Promise<Row | null> {
    try {
      let stmt = this.db.prepare(sql)
      if (params && params.length > 0) {
        stmt = stmt.bind(...params)
      }
      const row = await stmt.first<Row>()
      return row ?? null
    } catch (err) {
      throw this.mapError(err, 'queryOne')
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    try {
      let stmt = this.db.prepare(sql)
      if (params && params.length > 0) {
        stmt = stmt.bind(...params)
      }
      const result = await stmt.run()
      const changes = result.meta?.changes ?? result.meta?.rows_written ?? 0
      const lastInsertRowid = result.meta?.last_row_id
      return { changes, rowsAffected: changes, lastInsertRowid }
    } catch (err) {
      throw this.mapError(err, 'execute')
    }
  }

  async hasTable(table: string): Promise<boolean> {
    try {
      const row = await this.queryOne(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?",
        [table]
      )
      return row !== null
    } catch (err) {
      throw this.mapError(err, 'hasTable')
    }
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    validateIdentifier(table, 'table name')
    try {
      const rows = await this.query(`PRAGMA table_info(${quoteIdentifier(table)})`)
      return rows.map((r: any) => ({
        name: r.name,
        type: r.type,
        notNull: r.notnull === 1,
        primaryKey: r.pk > 0,
        defaultValue: r.dflt_value,
      }))
    } catch (err) {
      throw this.mapError(err, 'tableInfo')
    }
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    validateIdentifier(table, 'table name')
    try {
      const rows = await this.query(
        "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
        [table]
      )
      const indexes: Record<string, string> = {}
      for (const row of rows) {
        if (row.name && row.sql) {
          indexes[row.name] = row.sql
        }
      }
      return indexes
    } catch (err) {
      throw this.mapError(err, 'tableIndexes')
    }
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    validateIdentifier(name, 'table name')
    const colDefs = columns.map(c => {
      validateIdentifier(c.name, 'column name')
      let def = `${quoteIdentifier(c.name)} ${c.type}`
      if (c.primaryKey) def += ' PRIMARY KEY'
      if (c.notNull) def += ' NOT NULL'
      if (c.unique) def += ' UNIQUE'
      if (c.default !== undefined) {
        def += ` DEFAULT ${typeof c.default === 'string' ? `'${c.default.replace(/'/g, "''")}'` : c.default}`
      }
      return def
    })
    const sql = `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(name)} (${colDefs.join(', ')})`
    await this.exec(sql)
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column.name, 'column name')
    let def = `${quoteIdentifier(column.name)} ${column.type}`
    if (column.notNull) def += ' NOT NULL'
    if (column.default !== undefined) {
      def += ` DEFAULT ${typeof column.default === 'string' ? `'${column.default.replace(/'/g, "''")}'` : column.default}`
    }
    await this.exec(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${def}`)
  }

  async dropColumn(table: string, column: string): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column, 'column name')
    await this.exec(`ALTER TABLE ${quoteIdentifier(table)} DROP COLUMN ${quoteIdentifier(column)}`)
  }

  async dropTable(table: string): Promise<void> {
    validateIdentifier(table, 'table name')
    await this.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`)
  }

  async dropView(view: string): Promise<void> {
    validateIdentifier(view, 'view name')
    await this.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(view)}`)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    validateIdentifier(name, 'view name')
    await this.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(name)}`)
    await this.exec(`CREATE VIEW ${quoteIdentifier(name)} AS ${selectQuery}`)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(name, 'index name')
    for (const c of columns) validateIdentifier(c, 'column name')
    const cols = columns.map(quoteIdentifier).join(', ')
    await this.exec(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${quoteIdentifier(table)} (${cols})`)
  }

  async dropIndex(name: string): Promise<void> {
    validateIdentifier(name, 'index name')
    await this.exec(`DROP INDEX IF EXISTS ${quoteIdentifier(name)}`)
  }

  async transaction<T>(_fn: () => Promise<T>): Promise<T> {
    throw new DatabaseError(
      DatabaseErrorCode.DATABASE_CAPABILITY_UNSUPPORTED,
      'Interactive multi-roundtrip transactions are unsupported on Cloudflare D1. Use batch() for atomic operations.'
    )
  }

  async batch(statements: { sql: string; params?: unknown[] }[]): Promise<ExecuteResult[]> {
    try {
      const preparedList = statements.map(s => {
        let stmt = this.db.prepare(s.sql)
        if (s.params && s.params.length > 0) {
          stmt = stmt.bind(...s.params)
        }
        return stmt
      })
      const results = await this.db.batch(preparedList)
      return results.map(r => ({
        changes: 0,
        rowsAffected: 0,
      }))
    } catch (err) {
      throw this.mapError(err, 'batch')
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.queryOne('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  private mapError(err: unknown, operation: string): DatabaseError {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE constraint failed') || message.includes('constraint failed')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_CONSTRAINT, `${operation}: ${message}`, { cause: err })
    }
    if (message.includes('no such table') || message.includes('no such column')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_SCHEMA_ERROR, `${operation}: ${message}`, { cause: err })
    }
    if (message.includes('syntax error')) {
      return new DatabaseError(DatabaseErrorCode.DATABASE_INVALID_QUERY, `${operation}: ${message}`, { cause: err })
    }
    return new DatabaseError(DatabaseErrorCode.DATABASE_UNAVAILABLE, `${operation}: ${message}`, { retryable: true, cause: err })
  }
}
