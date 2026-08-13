import { SchemaDriver, ColumnDef, ColumnInfo } from '../types'
import { validateIdentifier, validateAndQuote } from '../../../utils/sql_safe'
import { ConnectionStrategy, QueryOutcome, StrategyQuery } from './connection'
import { mapPgError } from './errors'

const PG_TYPE_NORMALIZATION: Record<string, string> = {
  text: 'TEXT',
  'character varying': 'TEXT',
  integer: 'INTEGER',
  smallint: 'INTEGER',
  bigint: 'INTEGER',
  real: 'REAL',
  'double precision': 'REAL',
  numeric: 'REAL',
  boolean: 'BOOLEAN',
  json: 'JSON',
  jsonb: 'JSONB',
  timestamp: 'TEXT',
  'timestamp without time zone': 'TEXT',
  'timestamp with time zone': 'TEXT',
  date: 'TEXT',
  uuid: 'TEXT',
}

function serializeDefault(value: unknown): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return `'${String(value).replace(/'/g, "''")}'`
}

export class PostgresSchemaDriver implements SchemaDriver {
  constructor(
    private conn: ConnectionStrategy,
    private getTxQuery: () => StrategyQuery | null = () => null,
  ) { }

  private async run(sql: string, params?: unknown[]): Promise<QueryOutcome> {
    try {
      const txQuery = this.getTxQuery()
      if (txQuery) return await txQuery(sql, params)
      return await this.conn.query(sql, params)
    } catch (err) {
      throw mapPgError(err, 'schema')
    }
  }

  async hasTable(table: string): Promise<boolean> {
    const result = await this.run(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = LOWER($1)
         UNION ALL
         SELECT 1 FROM information_schema.views WHERE LOWER(table_name) = LOWER($1)
       ) AS found`,
      [table],
    )
    return Boolean(result.rows[0]?.found)
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    validateIdentifier(table, 'table name')
    const columns = await this.run(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE LOWER(table_name) = LOWER($1)
       ORDER BY ordinal_position`,
      [table],
    )
    const pkRows = await this.run(
      `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = to_regclass($1) AND i.indisprimary`,
      [table],
    )
    const pkSet = new Set(pkRows.rows.map(r => r.attname))

    return columns.rows.map(r => ({
      name: r.column_name,
      type: PG_TYPE_NORMALIZATION[r.data_type] ?? String(r.data_type).toUpperCase(),
      notNull: r.is_nullable === 'NO',
      primaryKey: pkSet.has(r.column_name),
      defaultValue: r.column_default ?? undefined,
    }))
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    const result = await this.run(
      `SELECT indexname, indexdef FROM pg_indexes WHERE LOWER(tablename) = LOWER($1)`,
      [table],
    )
    const out: Record<string, string> = {}
    for (const row of result.rows) {
      out[row.indexname] = row.indexdef
    }
    return out
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    validateIdentifier(name, 'table name')
    const defs = columns.map(c => {
      validateIdentifier(c.name, 'column name')
      let s = `${validateAndQuote(c.name)} ${c.type}`
      if (c.primaryKey) s += ' PRIMARY KEY'
      if (c.notNull) s += ' NOT NULL'
      if (c.unique) s += ' UNIQUE'
      if (c.default !== undefined) s += ` DEFAULT ${serializeDefault(c.default)}`
      return s
    })
    await this.run(`CREATE TABLE IF NOT EXISTS ${validateAndQuote(name)} (${defs.join(', ')})`)
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column.name, 'column name')
    let def = `${column.type}`
    if (column.notNull) def += ' NOT NULL'
    if (column.default !== undefined) def += ` DEFAULT ${serializeDefault(column.default)}`
    await this.run(
      `ALTER TABLE ${validateAndQuote(table)} ADD COLUMN IF NOT EXISTS ${validateAndQuote(column.name)} ${def}`,
    )
  }

  async dropColumn(table: string, column: string): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(column, 'column name')
    await this.run(`ALTER TABLE ${validateAndQuote(table)} DROP COLUMN IF EXISTS ${validateAndQuote(column)}`)
  }

  async dropTable(table: string): Promise<void> {
    validateIdentifier(table, 'table name')
    await this.run(`DROP TABLE IF EXISTS ${validateAndQuote(table)}`)
  }

  async dropView(view: string): Promise<void> {
    validateIdentifier(view, 'view name')
    await this.run(`DROP VIEW IF EXISTS ${validateAndQuote(view)}`)
  }

  async saveView(name: string, selectQuery: string): Promise<void> {
    validateIdentifier(name, 'view name')
    // NOTE: selectQuery is inherently dangerous — callers MUST validate it
    // (mirrors SQLite driver contract; see schema_sync.ts)
    await this.run(`DROP VIEW IF EXISTS ${validateAndQuote(name)}`)
    await this.run(`CREATE VIEW ${validateAndQuote(name)} AS ${selectQuery}`)
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    validateIdentifier(table, 'table name')
    validateIdentifier(name, 'index name')
    const quotedCols = columns.map(c => {
      const parts = c.trim().split(/\s+/)
      validateIdentifier(parts[0], 'index column name')
      return parts.length > 1 ? `${validateAndQuote(parts[0])} ${parts[1]}` : validateAndQuote(parts[0])
    })
    await this.run(
      `CREATE INDEX IF NOT EXISTS ${validateAndQuote(name)} ON ${validateAndQuote(table)} (${quotedCols.join(', ')})`,
    )
  }

  async dropIndex(name: string): Promise<void> {
    validateIdentifier(name, 'index name')
    await this.run(`DROP INDEX IF EXISTS ${validateAndQuote(name)}`)
  }
}