import Database from 'better-sqlite3'
import { TransactionDriver } from '../types'
import { DatabaseError, DatabaseErrorCode } from '../errors'

export class SQLiteTransactionDriver implements TransactionDriver {
  private inTransaction = false

  constructor(private db: Database.Database) { }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      throw new DatabaseError(
        DatabaseErrorCode.DATABASE_TRANSACTION_FAILED,
        'Nested transactions are not supported.',
        { retryable: false },
      )
    }
    this.inTransaction = true
    this.db.exec('BEGIN')
    try {
      const result = await fn()
      this.db.exec('COMMIT')
      return result
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    } finally {
      this.inTransaction = false
    }
  }
}