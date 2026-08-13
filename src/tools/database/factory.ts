import { DatabaseDriver, DatabaseProviderType, PostgresConnectionConfig } from './types'
import { SqliteDriver } from './sqlite/driver'
import { PostgresDriver } from './postgres/driver'
import { DatabaseError, DatabaseErrorCode } from './errors'

export type DatabaseDriverConfig =
  | { provider: 'sqlite'; dataDir: string; queryTimeout?: number }
  | PostgresConnectionConfig

const SUPPORTED_PROVIDERS: DatabaseProviderType[] = ['sqlite', 'postgres']

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
    case 'postgres':
      return new PostgresDriver(config)
    default:
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Unsupported database provider "${(config as DatabaseDriverConfig).provider}".`,
      )
  }
}