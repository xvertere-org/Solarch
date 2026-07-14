import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { SqliteQueryBuilder, QueryBuilder } from '../search/query-builder'
import { validateIdentifier, quoteIdentifier } from '../../utils/sql_safe'

export interface ColumnInfo {
  name: string
  type: string
  notnull: boolean
  pk: boolean
  dflt_value?: any
}

export interface ColumnDef {
  name: string
  type: string
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  default?: any
}

export interface Row {
  [key: string]: any
}

export interface Statement {
  run(...params: any[]): any
  get(...params: any[]): Row | undefined
  all(...params: any[]): Row[]
}

export class SqliteDriver {
  private dataDB: Database.Database
  private auxDB: Database.Database
  private dataDir: string
  private queryBuilder = new SqliteQueryBuilder()

  constructor(dataDir: string, isDev = false, queryTimeout = 30) {
    this.dataDir = dataDir
    fs.mkdirSync(dataDir, { recursive: true })
    this.dataDB = new Database(path.join(dataDir, 'data.db'))
    this.auxDB = new Database(path.join(dataDir, 'auxiliary.db'))
    this.dataDB.pragma(`journal_mode = WAL`)
    this.dataDB.pragma(`busy_timeout = ${queryTimeout * 1000}`)
    this.dataDB.pragma('foreign_keys = ON')
    this.auxDB.pragma(`journal_mode = WAL`)
    this.auxDB.pragma(`busy_timeout = ${queryTimeout * 1000}`)
    this.auxDB.pragma('foreign_keys = ON')

    const cosineSimilarity = (aJson: string, bJson: string): number | null => {
      try {
        const a = JSON.parse(aJson) as number[]
        const b = JSON.parse(bJson) as number[]
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null
        let dot = 0, normA = 0, normB = 0
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i]
          normA += a[i] * a[i]
          normB += b[i] * b[i]
        }
        if (normA === 0 || normB === 0) return null
        return dot / (Math.sqrt(normA) * Math.sqrt(normB))
      } catch { return null }
    }
    this.dataDB.function('vector_cosine_similarity', { deterministic: true }, cosineSimilarity)
  }

  async connect(): Promise<void> { }

  async close(): Promise<void> {
    this.dataDB.close()
    this.auxDB.close()
  }

  async exec(sql: string): Promise<void> {
    this.dataDB.exec(sql)
  }

  prepare(sql: string): Statement {
    return this.dataDB.prepare(sql) as unknown as Statement
  }

  async query(sql: string, params?: any[]): Promise<Row[]> {
    const stmt = this.dataDB.prepare(sql)
    return (params ? stmt.all(...params) : stmt.all()) as Row[]
  }

  async queryOne(sql: string, params?: any[]): Promise<Row | null> {
    const stmt = this.dataDB.prepare(sql)
    return (params ? stmt.get(...params) : stmt.get()) as Row | null
  }

  async hasTable(table: string): Promise<boolean> {
    const result = this.dataDB.prepare(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type IN ('table', 'view') AND LOWER(name) = LOWER(?)`
    ).get(table) as { count: number }
    return result.count > 0
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    validateIdentifier(table, 'table name')
    return this.dataDB.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as ColumnInfo[]
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    validateIdentifier(table, 'table name')
    const rows = this.dataDB.prepare(`PRAGMA index_list(${quoteIdentifier(table)})`).all() as Array<{ name: string; sql: string | null }>
    const result: Record<string, string> = {}
    for (const row of rows) {
      if (row.sql) result[row.name] = row.sql
    }
    return result
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    validateIdentifier(name, 'table name')
    const defs = columns.map(c => {
      validateIdentifier(c.name, 'column name')
      let s = `${quoteIdentifier(c.name)} ${c.type}`
      if (c.primaryKey) s += ' PRIMARY KEY'
      if (c.notNull) s += ' NOT NULL'
      if (c.unique) s += ' UNIQUE'
      if (c.default !== undefined) s += ` DEFAULT ${JSON.stringify(c.default)}`
      return s
    })
    this.dataDB.exec(`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(name)} (${defs.join(', ')})`)
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column.name, 'column name')
    let def = `${column.type}`
    if (column.notNull) def += ' NOT NULL'
    if (column.default !== undefined) def += ` DEFAULT ${JSON.stringify(column.default)}`
    this.dataDB.exec(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(column.name)} ${def}`)
  }

  async dropColumn(table: string, column: string): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column, 'column name')
    try { this.dataDB.exec(`ALTER TABLE ${quoteIdentifier(table)} DROP COLUMN ${quoteIdentifier(column)}`) } catch { }
  }

  async dropTable(table: string): Promise<void> {
    validateIdentifier(table, 'table name')
    this.dataDB.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`)
  }

  async dropView(view: string): Promise<void> {
    validateIdentifier(view, 'view name')
    this.dataDB.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(view)}`)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    validateIdentifier(name, 'view name')
    // NOTE: selectQuery is inherently dangerous — callers MUST validate it
    // (e.g., via EXPLAIN opcode checking as done in schema_sync.ts)
    this.dataDB.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(name)}`)
    this.dataDB.exec(`CREATE VIEW ${quoteIdentifier(name)} AS ${selectQuery}`)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(name, 'index name')
    const quotedCols = columns.map(c => {
      const parts = c.trim().split(/\s+/)
      validateIdentifier(parts[0], 'index column name')
      return parts.length > 1 ? `${quoteIdentifier(parts[0])} ${parts[1]}` : quoteIdentifier(parts[0])
    })
    this.dataDB.exec(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${quoteIdentifier(table)} (${quotedCols.join(', ')})`)
  }

  async dropIndex(name: string): Promise<void> {
    validateIdentifier(name, 'index name')
    this.dataDB.exec(`DROP INDEX IF EXISTS ${quoteIdentifier(name)}`)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.dataDB.transaction(async () => fn())()
  }

  async ping(): Promise<boolean> {
    try {
      this.dataDB.exec('SELECT 1')
      return true
    } catch { return false }
  }

  getDialect(): string {
    return 'sqlite'
  }

  getDataDB(): Database.Database {
    return this.dataDB
  }

  getAuxDB(): Database.Database {
    return this.auxDB
  }
}
