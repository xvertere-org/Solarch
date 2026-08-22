/**
 * Solarch CLI Ecosystem — Database Strategy Contract (Phase 0)
 *
 * Defines canonical database strategy representation.
 * Supports SQLite, PostgreSQL, MongoDB, and deployment-aware topologies
 * (e.g. SQLite local + PostgreSQL cloud, PostgreSQL + pgvector for AI).
 *
 * INVARIANT: Never contains credentials, connection strings, passwords, or tokens.
 */

export type DatabaseEngine = 'sqlite' | 'postgres' | 'mongodb'

export type DatabaseTopology =
  | 'sqlite_only'
  | 'postgres_only'
  | 'mongodb_only'
  | 'sqlite_local_postgres_cloud'

export interface DatabaseCapabilities {
  vector?: boolean
  multiTenant?: boolean
  replication?: boolean
  [key: string]: any
}

export interface DatabaseStrategyInput {
  engine: DatabaseEngine
  topology?: DatabaseTopology
  capabilities?: DatabaseCapabilities
  source?: 'user' | 'recommendation' | 'default'
}

export class DatabaseStrategy {
  public readonly engine: DatabaseEngine
  public readonly topology: DatabaseTopology
  public readonly capabilities: Readonly<DatabaseCapabilities>
  public readonly source: 'user' | 'recommendation' | 'default'

  constructor(input: DatabaseStrategyInput) {
    DatabaseStrategy.assertNoSecrets(input)

    this.engine = input.engine
    this.source = input.source ?? 'default'
    this.capabilities = Object.freeze({ ...(input.capabilities || {}) })

    if (input.topology) {
      this.topology = input.topology
    } else {
      switch (this.engine) {
        case 'postgres':
          this.topology = 'postgres_only'
          break
        case 'mongodb':
          this.topology = 'mongodb_only'
          break
        case 'sqlite':
        default:
          this.topology = 'sqlite_only'
          break
      }
    }
  }

  public hasVector(): boolean {
    return !!this.capabilities.vector
  }

  public isHybrid(): boolean {
    return this.topology === 'sqlite_local_postgres_cloud'
  }

  public toJSON() {
    return {
      engine: this.engine,
      topology: this.topology,
      capabilities: this.capabilities,
      source: this.source,
    }
  }

  /**
   * Static invariant check ensuring no credential fields are present.
   */
  public static assertNoSecrets(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    const forbiddenKeys = [
      'password',
      'secret',
      'token',
      'connectionstring',
      'dburl',
      'databaseurl',
      'url',
      'user',
      'username',
      'host',
      'port',
    ]

    const check = (item: any) => {
      if (!item || typeof item !== 'object') return
      for (const [k, v] of Object.entries(item)) {
        const lower = k.toLowerCase()
        if (forbiddenKeys.some(fk => lower === fk || lower.includes('password') || lower.includes('secret') || lower.includes('url'))) {
          throw new Error(`DatabaseStrategy invariant violation: credentials or connection URLs are strictly forbidden in strategy (found key: "${k}").`)
        }
        if (typeof v === 'object' && v !== null) {
          check(v)
        }
      }
    }

    check(obj)
  }
}
