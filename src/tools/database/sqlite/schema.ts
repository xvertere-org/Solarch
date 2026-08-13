import Database from 'better-sqlite3'
import { SchemaDriver, ColumnDef, ColumnInfo } from '../types'
import { validateIdentifier, quoteIdentifier } from '../../../utils/sql_safe'

export class SQLiteSchemaDriver implements SchemaDriver {
  constructor(private db: Database.Database) { }

  async hasTable(table: string): Promise<boolean> {
    const result = this.db.prepare(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type IN ('table', 'view') AND LOWER(name) = LOWER(?)`
    ).get(table) as { count: number }
    return result.count > 0
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    validateIdentifier(table, 'table name')
    const rows = this.db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as Array<{
      name: string
      type: string
      notnull: number
      pk: number
      dflt_value: any
    }>
    return rows.map(r => ({
      name: r.name,
      type: r.type,
      notNull: r.notnull === 1,
      primaryKey: r.pk === 1,
      defaultValue: r.dflt_value,
    }))
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    validateIdentifier(table, 'table name')
    const rows = this.db.prepare(
      `SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL`
    ).all(table) as Array<{ name: string; sql: string }>
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.name] = row.sql
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
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(name)} (${defs.join(', ')})`)
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column.name, 'column name')
    let def = `${column.type}`
    if (column.notNull) def += ' NOT NULL'
    if (column.default !== undefined) def += ` DEFAULT ${JSON.stringify(column.default)}`
    this.db.exec(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(column.name)} ${def}`)
  }

  async dropColumn(table: string, column: string): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column, 'column name')
    try { this.db.exec(`ALTER TABLE ${quoteIdentifier(table)} DROP COLUMN ${quoteIdentifier(column)}`) } catch { }
  }

  async dropTable(table: string): Promise<void> {
    validateIdentifier(table, 'table name')
    this.db.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`)
  }

  async dropView(view: string): Promise<void> {
    validateIdentifier(view, 'view name')
    this.db.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(view)}`)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    validateIdentifier(name, 'view name')
    // NOTE: selectQuery is inherently dangerous — callers MUST validate it
    // (e.g., via EXPLAIN opcode checking as done in schema_sync.ts)
    this.db.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(name)}`)
    this.db.exec(`CREATE VIEW ${quoteIdentifier(name)} AS ${selectQuery}`)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(name, 'index name')
    const quotedCols = columns.map(c => {
      const parts = c.trim().split(/\s+/)
      validateIdentifier(parts[0], 'index column name')
      return parts.length > 1 ? `${quoteIdentifier(parts[0])} ${parts[1]}` : quoteIdentifier(parts[0])
    })
    this.db.exec(`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${quoteIdentifier(table)} (${quotedCols.join(', ')})`)
  }

  async dropIndex(name: string): Promise<void> {
    validateIdentifier(name, 'index name')
    this.db.exec(`DROP INDEX IF EXISTS ${quoteIdentifier(name)}`)
  }
}
