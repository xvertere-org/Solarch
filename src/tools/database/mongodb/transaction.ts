import { TransactionDriver } from '../types'
import { MongoConnection } from './connection'
import { normalizeMongoError } from './errors'

export class MongoTransactionManager implements TransactionDriver {
  private conn: MongoConnection

  constructor(conn: MongoConnection) {
    this.conn = conn
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.conn.getSession()) {
      throw new Error('Nested transactions are not supported.')
    }
    const client = this.conn.getClient()
    const session = client.startSession()

    try {
      let result: T
      await session.withTransaction(async () => {
        result = await this.conn.runWithSession(session, fn)
      })
      return result!
    } catch (err: any) {
      // If standalone server without replica set, execute directly or throw
      if (err?.message && /standalone.*transaction|Transaction numbers are only allowed on a replica set/i.test(err.message)) {
        return await fn()
      }
      throw normalizeMongoError(err)
    } finally {
      await session.endSession()
    }
  }
}
