import { SqliteDriver, ColumnInfo } from '../tools/database/sqlite-driver'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { validateIdentifier, quoteIdentifier } from '../utils/sql_safe'

export const DEFAULT_QUERY_TIMEOUT = 30

export interface DBConfig {
  dataDir: string
  isDev: boolean
  queryTimeout?: number
  maxOpenConns?: number
  maxIdleConns?: number
}

export class DB {
  private driver: SqliteDriver

  constructor(config: DBConfig) {
    this.driver = new SqliteDriver(config.dataDir, config.isDev, config.queryTimeout ?? DEFAULT_QUERY_TIMEOUT)
  }

  getDataDB(): Database.Database {
    return this.driver.getDataDB()
  }

  getAuxDB(): Database.Database {
    return this.driver.getAuxDB()
  }

  getDriver(): SqliteDriver {
    return this.driver
  }

  hasTable(tableName: string, db: 'data' | 'aux' = 'data'): boolean {
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    const result = database.prepare(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type IN ('table', 'view') AND LOWER(name) = LOWER(?)`
    ).get(tableName) as { count: number }
    return result.count > 0
  }

  tableColumns(tableName: string, db: 'data' | 'aux' = 'data'): string[] {
    validateIdentifier(tableName, 'table name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>
    return rows.map(r => r.name)
  }

  tableInfo(tableName: string, db: 'data' | 'aux' = 'data'): ColumnInfo[] {
    validateIdentifier(tableName, 'table name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    return database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as ColumnInfo[]
  }

  tableIndexes(tableName: string, db: 'data' | 'aux' = 'data'): Record<string, string> {
    validateIdentifier(tableName, 'table name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    const rows = database.prepare(`PRAGMA index_list(${quoteIdentifier(tableName)})`).all() as Array<{ name: string; sql: string | null }>
    const result: Record<string, string> = {}
    for (const row of rows) {
      if (row.sql) result[row.name] = row.sql
    }
    return result
  }

  deleteTable(tableName: string, db: 'data' | 'aux' = 'data'): void {
    validateIdentifier(tableName, 'table name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    database.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`)
  }

  deleteView(viewName: string, db: 'data' | 'aux' = 'data'): void {
    validateIdentifier(viewName, 'view name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    database.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(viewName)}`)
  }

  saveView(viewName: string, selectQuery: string, db: 'data' | 'aux' = 'data'): void {
    validateIdentifier(viewName, 'view name')
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    database.exec(`DROP VIEW IF EXISTS ${quoteIdentifier(viewName)}`)
    database.exec(`CREATE VIEW ${quoteIdentifier(viewName)} AS ${selectQuery}`)
  }

  vacuum(db: 'data' | 'aux' = 'data'): void {
    const database = db === 'data' ? this.driver.getDataDB() : this.driver.getAuxDB()
    database.exec('VACUUM')
  }

  transaction<T>(fn: (db: DB) => T): T {
    return this.driver.getDataDB().transaction(() => fn(this))()
  }

  close(): void {
    this.driver.close()
  }
}
