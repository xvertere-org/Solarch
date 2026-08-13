import Database from 'better-sqlite3'
import { DatabaseBackupDriver } from '../types'

export class SQLiteBackupDriver implements DatabaseBackupDriver {
  constructor(private dataDB: Database.Database, private auxDB: Database.Database) { }

  private getDB(target?: string): Database.Database {
    return target === 'aux' ? this.auxDB : this.dataDB
  }

  async checkpoint(target?: string): Promise<void> {
    this.getDB(target).exec('PRAGMA wal_checkpoint(TRUNCATE)')
  }

  async backupToFile(destPath: string, target?: string): Promise<void> {
    await this.getDB(target).backup(destPath)
  }
}