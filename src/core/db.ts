import { createDatabaseDriver, DatabaseDriverConfig } from '../tools/database/factory'
import { DatabaseDriver, ColumnInfo } from '../tools/database/types'
import { validateIdentifier, quoteIdentifier } from '../utils/sql_safe'

import { ResolvedDatabaseConfig } from './config_types'

export const DEFAULT_QUERY_TIMEOUT = 30

export interface DBConfig {
  provider?: 'sqlite' | 'postgres' | 'mongodb'
  dataDir?: string
  database?: string
  queryTimeout?: number
  connectionString?: string
  dbDriver?: 'postgres' | 'neon'
  driver?: 'postgres' | 'neon'
  dbMode?: 'tcp' | 'http' | 'websocket'
  mode?: 'tcp' | 'http' | 'websocket'
  pool?: {
    max?: number
    min?: number
    idleTimeoutMs?: number
    connectionTimeoutMs?: number
  }
}

export class DB {
  private driver: DatabaseDriver

  constructor(config: DBConfig | ResolvedDatabaseConfig, fallbackDataDir = './pb_data') {
    const provider = config.provider ?? 'sqlite'
    let driverConfig: DatabaseDriverConfig
    if (provider === 'postgres') {
      driverConfig = {
        provider: 'postgres',
        connectionString: config.connectionString ?? '',
        driver: (config as any).driver ?? (config as any).dbDriver,
        mode: (config as any).mode ?? (config as any).dbMode,
        queryTimeout: config.queryTimeout ?? DEFAULT_QUERY_TIMEOUT,
        pool: config.pool,
      }
    } else if (provider === 'mongodb') {
      driverConfig = {
        provider: 'mongodb',
        connectionString: config.connectionString ?? '',
        database: (config as any).database,
        queryTimeout: config.queryTimeout ?? DEFAULT_QUERY_TIMEOUT,
        pool: config.pool,
      }
    } else {
      driverConfig = {
        provider: 'sqlite',
        dataDir: (config as any).dataDir ?? fallbackDataDir,
        queryTimeout: config.queryTimeout ?? DEFAULT_QUERY_TIMEOUT,
      }
    }
    this.driver = createDatabaseDriver(driverConfig)
  }

  getDriver(): DatabaseDriver {
    return this.driver
  }

  /** @deprecated Replaced by contractual driver methods */
  getDataDB() {
    return (this.driver as any).getDataDB()
  }

  /** @deprecated Replaced by contractual driver methods */
  getAuxDB() {
    return (this.driver as any).getAuxDB()
  }

  async query<T = any>(sql: string, params?: unknown[]): Promise<T[]> {
    return (await this.driver.query(sql, params)) as T[]
  }

  async queryOne<T = any>(sql: string, params?: unknown[]): Promise<T | null> {
    return (await this.driver.queryOne(sql, params)) as T | null
  }

  async execute(sql: string, params?: unknown[]) {
    return this.driver.execute(sql, params)
  }

  async ping(): Promise<boolean> {
    return this.driver.ping()
  }

  async checkpoint(target?: string): Promise<void> {
    if ('checkpoint' in this.driver && typeof (this.driver as any).checkpoint === 'function') {
      await (this.driver as any).checkpoint(target)
    }
  }

  async backupToFile(destPath: string, target?: string): Promise<void> {
    if ('backupToFile' in this.driver && typeof (this.driver as any).backupToFile === 'function') {
      await (this.driver as any).backupToFile(destPath, target)
    }
  }

  async hasTable(tableName: string): Promise<boolean> {
    return this.driver.hasTable(tableName)
  }

  async tableColumns(tableName: string): Promise<string[]> {
    const info = await this.driver.tableInfo(tableName)
    return info.map(c => c.name)
  }

  async tableInfo(tableName: string): Promise<ColumnInfo[]> {
    return this.driver.tableInfo(tableName)
  }

  async tableIndexes(tableName: string): Promise<Record<string, string>> {
    return this.driver.tableIndexes(tableName)
  }

  async deleteTable(tableName: string): Promise<void> {
    return this.driver.dropTable(tableName)
  }

  async deleteView(viewName: string): Promise<void> {
    return this.driver.dropView(viewName)
  }

  async saveView(viewName: string, selectQuery: string): Promise<void> {
    return this.driver.saveView(viewName, selectQuery)
  }

  async vacuum(): Promise<void> {
    await this.driver.execute('VACUUM')
  }

  async transaction<T>(fn: (tx: DB) => Promise<T>): Promise<T> {
    return this.driver.transaction(() => fn(this))
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}
