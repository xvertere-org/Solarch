import { SchemaDriver, ColumnDef, ColumnInfo } from '../types'
import { MongoConnection } from './connection'
import { normalizeMongoError } from './errors'

export class MongoSchemaManager implements SchemaDriver {
  private conn: MongoConnection
  private schemaCache: Map<string, ColumnDef[]> = new Map()

  constructor(conn: MongoConnection) {
    this.conn = conn
  }

  async hasTable(table: string): Promise<boolean> {
    try {
      const db = this.conn.getDb()
      const collections = await db.listCollections({ name: table }).toArray()
      return collections.length > 0
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    try {
      const db = this.conn.getDb()
      const exists = await this.hasTable(name)
      if (!exists) {
        await db.createCollection(name)
      }

      this.schemaCache.set(name, [...columns])

      // Ensure unique index on 'id' if 'id' is in columns or primaryKey
      const col = db.collection(name)
      const hasId = columns.some(c => c.name === 'id' || c.primaryKey)
      if (hasId) {
        try {
          await col.createIndex({ id: 1 }, { unique: true, name: `idx_${name}_id` })
        } catch {
          // ignore index creation if already exists
        }
      }

      // Create unique indexes for columns with unique: true
      for (const column of columns) {
        if (column.unique && column.name !== 'id') {
          try {
            await col.createIndex({ [column.name]: 1 }, { unique: true, name: `idx_${name}_${column.name}_unique` })
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async dropTable(table: string): Promise<void> {
    try {
      const db = this.conn.getDb()
      this.schemaCache.delete(table)
      const exists = await this.hasTable(table)
      if (exists) {
        await db.collection(table).drop()
      }
    } catch (err: any) {
      if (err?.code === 26 || /ns not found|NamespaceNotFound/i.test(err?.message)) {
        return
      }
      throw normalizeMongoError(err)
    }
  }

  async tableInfo(table: string): Promise<ColumnInfo[]> {
    try {
      const exists = await this.hasTable(table)
      if (!exists) return []

      const cached = this.schemaCache.get(table)
      if (cached && cached.length > 0) {
        return cached.map(c => ({
          name: c.name,
          type: c.type || 'TEXT',
          notNull: !!c.notNull,
          primaryKey: !!c.primaryKey,
          defaultValue: c.default,
        }))
      }

      const db = this.conn.getDb()
      const sample = await db.collection(table).findOne({})
      
      const cols: ColumnInfo[] = [
        { name: 'id', type: 'TEXT', notNull: true, primaryKey: true },
        { name: 'created', type: 'TEXT', notNull: false, primaryKey: false },
        { name: 'updated', type: 'TEXT', notNull: false, primaryKey: false },
      ]

      if (sample) {
        for (const key of Object.keys(sample)) {
          if (key === '_id' || key === 'id' || key === 'created' || key === 'updated') continue
          const val = sample[key]
          let type = 'TEXT'
          if (typeof val === 'number') type = Number.isInteger(val) ? 'INTEGER' : 'REAL'
          else if (typeof val === 'boolean') type = 'BOOLEAN'
          else if (typeof val === 'object') type = 'JSON'
          cols.push({
            name: key,
            type,
            notNull: false,
            primaryKey: false,
          })
        }
      }

      return cols
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async tableIndexes(table: string): Promise<Record<string, string>> {
    try {
      const exists = await this.hasTable(table)
      if (!exists) return {}

      const db = this.conn.getDb()
      const indexes = await db.collection(table).indexes()
      const result: Record<string, string> = {}

      for (const idx of indexes) {
        if (!idx.name || idx.name === '_id_') continue
        const keys = Object.keys(idx.key || {}).join(', ')
        result[idx.name] = keys
      }

      return result
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async createIndex(table: string, name: string, columns: string[]): Promise<void> {
    try {
      const db = this.conn.getDb()
      const col = db.collection(table)
      const keySpec: Record<string, 1> = {}
      for (const c of columns) {
        keySpec[c.trim()] = 1
      }
      await col.createIndex(keySpec, { name })
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async dropIndex(name: string): Promise<void> {
    try {
      const db = this.conn.getDb()
      const collections = await db.listCollections().toArray()
      for (const c of collections) {
        try {
          const col = db.collection(c.name)
          const indexes = await col.indexes()
          if (indexes.some(i => i.name === name)) {
            await col.dropIndex(name)
            return
          }
        } catch {
          // ignore drop errors on non-matching collections
        }
      }
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async addColumn(table: string, column: ColumnDef): Promise<void> {
    const existing = this.schemaCache.get(table) || []
    this.schemaCache.set(table, [...existing.filter(c => c.name !== column.name), column])
  }

  async dropColumn(table: string, column: string): Promise<void> {
    const existing = this.schemaCache.get(table) || []
    this.schemaCache.set(table, existing.filter(c => c.name !== column))
  }

  async dropView(view: string): Promise<void> {
    return this.dropTable(view)
  }

  async saveView(name: string, _selectQuery: string): Promise<void> {
    try {
      const db = this.conn.getDb()
      const exists = await this.hasTable(name)
      if (!exists) {
        await db.createCollection(name)
      }
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }
}
