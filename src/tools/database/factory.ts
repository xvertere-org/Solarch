import { DatabaseDriver, DatabaseProviderType, PostgresConnectionConfig, MongoConnectionConfig } from './types'
import { SqliteDriver } from './sqlite/driver'
import { PostgresDriver } from './postgres/driver'
import { MongoDBDriver } from './mongodb/driver'
import { D1DatabaseDriver, D1DatabaseBinding } from './d1/d1_driver'
import { DatabaseError, DatabaseErrorCode } from './errors'

export type DatabaseDriverConfig =
  | { provider: 'sqlite'; dataDir: string; queryTimeout?: number }
  | { provider: 'd1'; binding: D1DatabaseBinding }
  | PostgresConnectionConfig
  | MongoConnectionConfig

const SUPPORTED_PROVIDERS: DatabaseProviderType[] = ['sqlite', 'postgres', 'mongodb', 'd1']

export function createDatabaseDriver(config: DatabaseDriverConfig): DatabaseDriver {
  if (!SUPPORTED_PROVIDERS.includes(config.provider)) {
    throw new DatabaseError(
      DatabaseErrorCode.DATABASE_UNAVAILABLE,
      `Unsupported database provider "${config.provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}.`,
      { retryable: false },
    )
  }
  switch (config.provider) {
    case 'sqlite':
      return new SqliteDriver(config.dataDir, config.queryTimeout ?? 30)
    case 'd1':
      return new D1DatabaseDriver(config.binding)
    case 'postgres':
      return new PostgresDriver(config)
    case 'mongodb':
      if (!config.connectionString || !config.connectionString.trim()) {
        throw new DatabaseError(
          DatabaseErrorCode.DATABASE_UNAVAILABLE,
          'connectionString is required for mongodb provider.',
          { retryable: false },
        )
      }
      return new MongoDBDriver(config)
    default:
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Unsupported database provider "${(config as DatabaseDriverConfig).provider}".`,
      )
  }
}