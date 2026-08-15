import path from 'path'
import fs from 'fs'
import {
  ResolvedAppConfig,
  ResolvedDatabaseConfig,
  SolarchConfigInput,
  ConfigFileSchema,
  DatabaseProviderType,
} from './config_types'
import { DatabaseError, DatabaseErrorCode } from '../tools/database/errors'

export interface ResolveConfigOptions {
  loadConfigFile?: boolean
  cwd?: string
}

/**
 * Loads configuration file (solarch.config.js or solarch.config.json) from working directory.
 * Fails fast with descriptive error if file exists but is malformed.
 */
export function loadConfigFile(cwd = process.cwd()): ConfigFileSchema | null {
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  if (fs.existsSync(jsPath)) {
    try {
      // Clear require cache for testing/reloading
      delete require.cache[require.resolve(jsPath)]
      const mod = require(jsPath)
      return mod.default || mod
    } catch (err: any) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Failed to load config file ${jsPath}: ${err.message}`,
        { retryable: false, cause: err },
      )
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8')
      return JSON.parse(content)
    } catch (err: any) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Failed to parse config file ${jsonPath}: ${err.message}`,
        { retryable: false, cause: err },
      )
    }
  }

  return null
}

/**
 * Resolves full application configuration across CLI/input options,
 * environment variables, configuration files, and default fallbacks.
 *
 * Enforces strict per-field precedence:
 * CLI / Programmatic Input > Environment Variables > Config File > Defaults
 */
export function resolveAppConfig(
  input: Partial<SolarchConfigInput> = {},
  env: NodeJS.ProcessEnv = process.env,
  options: ResolveConfigOptions = {},
): ResolvedAppConfig {
  const shouldLoadConfigFile = options.loadConfigFile ?? false
  const fileConfig = shouldLoadConfigFile ? loadConfigFile(options.cwd) : null

  // 1. Connection string resolution
  const connectionString =
    (input.db?.connectionString || input.connectionString || input.dbUrl || input.databaseUrl) ??
    env.DATABASE_URL ??
    fileConfig?.database?.url ??
    undefined

  // 1b. Database name resolution (especially for MongoDB / multi-tenant)
  const database =
    (input.db?.database || input.database) ??
    env.DATABASE_NAME ??
    env.DB_NAME ??
    undefined

  // 2. Explicit provider resolution
  const explicitProvider =
    (input.db?.provider || input.dbProvider || input.provider) ??
    (env.DB_PROVIDER || env.DATABASE_PROVIDER as DatabaseProviderType) ??
    fileConfig?.database?.type ??
    undefined

  let provider: DatabaseProviderType
  if (explicitProvider) {
    if (explicitProvider !== 'sqlite' && explicitProvider !== 'postgres' && explicitProvider !== 'mongodb') {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Unsupported database provider "${explicitProvider}". Supported: sqlite, postgres, mongodb.`,
        { retryable: false },
      )
    }
    provider = explicitProvider
  } else if (connectionString && connectionString.trim()) {
    // Invariant: DATABASE_URL is an implicit provider-selection signal only when no higher provider is configured
    if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
      provider = 'mongodb'
    } else {
      provider = 'postgres'
    }
  } else {
    provider = 'sqlite'
  }

  // 3. PostgreSQL / MongoDB connection string requirement validation
  if (provider === 'postgres') {
    if (!connectionString || !connectionString.trim()) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        'PostgreSQL requires a non-empty connectionString. Set DATABASE_URL or provide --db-url.',
        { retryable: false },
      )
    }
  } else if (provider === 'mongodb') {
    if (!connectionString || !connectionString.trim()) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        'MongoDB requires a non-empty connectionString. Set DATABASE_URL or provide --db-url.',
        { retryable: false },
      )
    }
  }

  // 4. Driver resolution & validation
  const explicitDriver =
    (input.db?.driver || input.dbDriver || input.driver) ??
    (env.DB_DRIVER as 'postgres' | 'neon') ??
    fileConfig?.database?.driver ??
    undefined

  let driver: 'postgres' | 'neon' | undefined
  if (provider === 'postgres') {
    driver = explicitDriver ?? 'postgres'
    if (driver !== 'postgres' && driver !== 'neon') {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_UNAVAILABLE,
        `Unsupported database driver "${driver}". Supported: postgres, neon.`,
        { retryable: false },
      )
    }
  }

  // 5. Mode resolution & validation
  const explicitMode =
    (input.dbMode || input.mode) ??
    (env.DB_MODE as 'tcp' | 'http' | 'websocket') ??
    fileConfig?.database?.mode ??
    undefined

  let mode: 'tcp' | 'http' | 'websocket' | undefined
  if (provider === 'postgres') {
    if (driver === 'postgres') {
      mode = explicitMode ?? 'tcp'
      if (mode !== 'tcp') {
        throw new DatabaseError(
          DatabaseErrorCode.DATABASE_UNAVAILABLE,
          `driver "postgres" uses mode "tcp"; got mode "${mode}". For Neon, use driver "neon".`,
          { retryable: false },
        )
      }
    } else if (driver === 'neon') {
      mode = explicitMode ?? 'http'
      if (mode !== 'http' && mode !== 'websocket') {
        throw new DatabaseError(
          DatabaseErrorCode.DATABASE_UNAVAILABLE,
          `driver "neon" requires mode "http" or "websocket".`,
          { retryable: false },
        )
      }
    }
  }

  // 6. Query Timeout
  const rawTimeout =
    (input.queryTimeout ?? input.defaultQueryTimeout) ??
    (env.QUERY_TIMEOUT ? parseInt(env.QUERY_TIMEOUT, 10) : undefined) ??
    fileConfig?.queryTimeout ??
    30
  const queryTimeout = Number.isNaN(rawTimeout) ? 30 : rawTimeout

  // 7. Data Directory
  const dataDir =
    (input.dataDir || input.defaultDataDir) ??
    env.DATA_DIR ??
    env.SOLARCH_DATA_DIR ??
    fileConfig?.dataDir ??
    './pb_data'

  // 8. Dev Mode
  const isDev =
    (input.isDev ?? input.defaultDev) ??
    (env.DEV === 'true' || env.SOLARCH_DEV === 'true' || env.NODE_ENV === 'development') ??
    fileConfig?.dev ??
    false

  // 9. Encryption Env Key
  const encryptionEnv =
    (input.encryptionEnv || input.defaultEncryptionEnv) ??
    env.SETTINGS_ENCRYPTION_KEY ??
    env.SOLARCH_ENCRYPTION_KEY ??
    fileConfig?.encryptionEnv ??
    ''

  // 10. Hide start banner
  const hideStartBanner = input.hideStartBanner ?? false

  // 11. Pool configuration
  const pool = input.db?.pool ?? input.pool ?? fileConfig?.database?.pool ?? {
    max: 10,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 5000,
  }

  const db: ResolvedDatabaseConfig = {
    provider,
    connectionString: (provider === 'postgres' || provider === 'mongodb') ? connectionString : undefined,
    database,
    driver,
    mode,
    queryTimeout,
    pool,
  }

  return {
    db,
    dataDir,
    isDev,
    encryptionEnv,
    hideStartBanner,
    queryTimeout,
    dataMaxOpenConns: input.dataMaxOpenConns,
    dataMaxIdleConns: input.dataMaxIdleConns,
    auxMaxOpenConns: input.auxMaxOpenConns,
    auxMaxIdleConns: input.auxMaxIdleConns,
  }
}
