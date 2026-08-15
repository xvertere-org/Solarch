import { MongoClient, Db, ClientSession } from 'mongodb'
import { AsyncLocalStorage } from 'async_hooks'
import { MongoConnectionConfig } from '../types'
import { normalizeMongoError } from './errors'

export class MongoConnection {
  private client: MongoClient | null = null
  private dbInstance: Db | null = null
  private config: MongoConnectionConfig
  private sessionStorage = new AsyncLocalStorage<ClientSession>()

  constructor(config: MongoConnectionConfig) {
    this.config = config
  }

  getSession(): ClientSession | undefined {
    return this.sessionStorage.getStore()
  }

  runWithSession<T>(session: ClientSession, fn: () => Promise<T>): Promise<T> {
    return this.sessionStorage.run(session, fn)
  }

  async connect(): Promise<void> {
    if (this.client && this.dbInstance) {
      return
    }

    try {
      const uri = this.config.connectionString
      const pool = this.config.pool

      this.client = new MongoClient(uri, {
        maxPoolSize: pool?.max ?? 10,
        minPoolSize: pool?.min ?? 1,
        maxIdleTimeMS: pool?.idleTimeoutMs ?? 30000,
        connectTimeoutMS: pool?.connectionTimeoutMs ?? 5000,
        serverSelectionTimeoutMS: this.config.queryTimeout ? this.config.queryTimeout * 1000 : 5000,
      })

      await this.client.connect()

      // Determine database name
      let dbName = this.config.database
      if (!dbName) {
        try {
          const parsed = new URL(uri)
          const pathname = parsed.pathname.replace(/^\//, '').trim()
          if (pathname) {
            dbName = pathname
          }
        } catch {
          // ignore uri parse errors
        }
      }

      this.dbInstance = this.client.db(dbName || 'solarch')
    } catch (err) {
      this.client = null
      this.dbInstance = null
      throw normalizeMongoError(err)
    }
  }

  getDb(): Db {
    if (!this.dbInstance) {
      throw new Error('MongoDB is not connected. Call connect() first.')
    }
    return this.dbInstance
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB is not connected. Call connect() first.')
    }
    return this.client
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.dbInstance) {
        await this.connect()
      }
      await this.dbInstance!.command({ ping: 1 })
      return true
    } catch {
      return false
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close()
      } finally {
        this.client = null
        this.dbInstance = null
      }
    }
  }
}
