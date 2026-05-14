import { BaseApp } from './base'
import { Collection } from './collection'
import { Field } from './field'
import { validateIdentifier } from '../utils/sql_safe'

export interface SchemaSyncResult {
  changed: boolean
  addedColumns: string[]
  removedColumns: string[]
  modifiedColumns: string[]
}

export async function syncRecordTableSchema(
  app: BaseApp,
  collection: Collection
): Promise<SchemaSyncResult> {
  if (collection.isView()) {
    return syncViewCollection(app, collection)
  }

  if (!collection.isBase() && !collection.isAuth()) {
    return { changed: false, addedColumns: [], removedColumns: [], modifiedColumns: [] }
  }

  const db = app.db().getDataDB()
  const tableName = `_r_${collection.id}`

  // Get existing columns
  const existingColumns = getExistingColumns(db, tableName)
  const existingColumnNames = new Set(existingColumns.map(c => c.name))

  // Build expected columns
  const expectedColumns = buildExpectedColumns(collection)

  const result: SchemaSyncResult = {
    changed: false,
    addedColumns: [],
    removedColumns: [],
    modifiedColumns: [],
  }

  // Add missing columns
  for (const [colName, colDef] of Object.entries(expectedColumns)) {
    if (!existingColumnNames.has(colName)) {
      try {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`)
        result.addedColumns.push(colName)
        result.changed = true
      } catch (err: any) {
        app.logger().error(`Failed to add column ${colName} to ${tableName}`, err.message)
      }
    }
  }

  // Note: SQLite doesn't support DROP COLUMN easily in older versions,
  // so we log removed columns but don't actually remove them to avoid data loss
  for (const col of existingColumns) {
    if (!expectedColumns[col.name] && !isSystemColumn(col.name)) {
      result.removedColumns.push(col.name)
      // We don't drop columns to preserve data, but we could rebuild the table if needed
    }
  }

  // Update indexes
  await syncIndexes(app, collection)

  return result
}

export async function createRecordTable(app: BaseApp, collection: Collection): Promise<void> {
  if (collection.isView()) {
    await syncViewCollection(app, collection)
    return
  }

  if (!collection.isBase() && !collection.isAuth()) return

  const db = app.db().getDataDB()
  const tableName = `_r_${collection.id}`

  const columns = buildExpectedColumns(collection)
  const columnDefs = Object.entries(columns).map(([name, def]) => `${name} ${def}`)

  db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs.join(', ')})`)

  await syncIndexes(app, collection)
}

async function syncViewCollection(app: BaseApp, collection: Collection): Promise<SchemaSyncResult> {
  const db = app.db().getDataDB()
  const viewName = `_r_${collection.id}`

  // Drop existing view if query changed
  try {
    db.exec(`DROP VIEW IF EXISTS ${viewName}`)
  } catch {
    // view might not exist
  }

  const query = collection.viewOptions?.query
  if (query) {
    // FIXED[H-4]: Use EXPLAIN to validate that query is a pure SELECT
    // The EXPLAIN approach is the definitive check — it will tell us whether the
    // query engine interprets this as a single SELECT statement or something else
    // (e.g., multi-statement, DDL, PRAGMA, ATTACH).
    try {
      const explainResult = db.prepare(`EXPLAIN ${query}`).all() as Array<{ opcode: string }>
      // Pure SELECT queries generate only a specific set of opcodes.
      // If the result contains opcodes like OpenWrite, CreateTable, etc., it's not read-only.
      const writeOpcodes = new Set([
        'OpenWrite', 'CreateTable', 'CreateIndex', 'Delete', 'Insert', 'Update',
        'BeginTransaction', 'CommitTransaction', 'RollbackTransaction',
        'Savepoint', 'Release', 'AttachDatabase', 'DetachDatabase',
        'CreateTrigger', 'DropTrigger', 'DropIndex', 'DropTable', 'DropView',
      ])
      for (const row of explainResult) {
        if (writeOpcodes.has(row.opcode)) {
          app.logger().error(`View query contains write opcodes for ${viewName}`, `opcode: ${row.opcode}`)
          return { changed: false, addedColumns: [], removedColumns: [], modifiedColumns: [] }
        }
      }
    } catch (explainErr: any) {
      app.logger().error(`EXPLAIN validation failed for view ${viewName}`, explainErr.message)
      return { changed: false, addedColumns: [], removedColumns: [], modifiedColumns: [] }
    }

    // Keep the prefix check as an additional safeguard
    const trimmed = query.trim().toLowerCase()
    if (!trimmed.startsWith('select')) {
      app.logger().error(`Invalid view query: ${viewName}`, 'View query must start with SELECT')
      return { changed: false, addedColumns: [], removedColumns: [], modifiedColumns: [] }
    }

    try {
      const safeViewName = validateIdentifier(viewName, 'view name')
      db.exec(`CREATE VIEW ${safeViewName} AS ${query}`)
    } catch (err: any) {
      app.logger().error(`Failed to create view ${viewName}`, err.message)
    }
}

  return { changed: false, addedColumns: [], removedColumns: [], modifiedColumns: [] }
}

function getExistingColumns(db: any, tableName: string): Array<{ name: string; type: string }> {
  try {
    return db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string; type: string }>
  } catch {
    return []
  }
}

function isSystemColumn(name: string): boolean {
  return ['id', 'created', 'updated', 'collectionId', 'collectionName'].includes(name)
}

function buildExpectedColumns(collection: Collection): Record<string, string> {
  const columns: Record<string, string> = {
    id: 'TEXT PRIMARY KEY',
    created: 'TEXT',
    updated: 'TEXT',
    collectionId: 'TEXT',
    collectionName: 'TEXT',
  }

  if (collection.isAuth()) {
    columns.email = 'TEXT UNIQUE'
    columns.emailVisibility = 'INTEGER DEFAULT 1'
    columns.passwordHash = 'TEXT'
    columns.verified = 'INTEGER DEFAULT 0'
    columns.lastResetSentAt = 'TEXT'
    columns.lastVerificationSentAt = 'TEXT'
    columns.username = 'TEXT'
    columns.lastLoginAt = 'TEXT'
  }

  for (const field of collection.fields) {
    columns[field.name] = getSQLiteType(field)
  }

  return columns
}

function getSQLiteType(field: Field): string {
  switch (field.type) {
    case 'number':
      return 'REAL'
    case 'bool':
      return 'INTEGER DEFAULT 0'
    case 'json':
      return 'TEXT'
    case 'file':
      return 'TEXT'
    case 'relation':
      return 'TEXT'
    case 'select':
      return 'TEXT'
    case 'date':
      return 'TEXT'
    case 'email':
      return 'TEXT'
    case 'url':
      return 'TEXT'
    case 'editor':
      return 'TEXT'
    case 'geoPoint':
      return 'TEXT'
    case 'vector':
      return 'TEXT'
    case 'autodate':
      return 'TEXT'
    default:
      return 'TEXT'
  }
}

async function syncIndexes(app: BaseApp, collection: Collection): Promise<void> {
  const db = app.db().getDataDB()
  const tableName = `_r_${collection.id}`

  // Get existing indexes
  const existingIndexes = db.prepare(`PRAGMA index_list(${tableName})`).all() as Array<{ name: string }>
  const existingIndexNames = new Set(existingIndexes.map(i => i.name))

  // Create indexes from collection definition
  for (const indexDef of collection.indexes) {
    const indexName = `idx_${collection.id}_${createHash('md5').update(indexDef).digest('hex').slice(0, 8)}`
    if (!existingIndexNames.has(indexName)) {
      try {
        // Only support field-list format: "field1, field2" or "field1 DESC, field2 ASC"
        // Raw CREATE INDEX strings are rejected to prevent SQL injection
        const fields = indexDef.split(',').map(f => f.trim()).filter(Boolean)
        if (fields.length === 0) {
          app.logger().error(`Invalid empty index definition for ${tableName}`, indexDef)
          continue
        }
        const validatedFields = fields.map(f => {
          const parts = f.split(/\s+/)
          const fieldName = parts[0]
          const direction = parts.length > 1 ? parts[1].toUpperCase() : ''
          if (direction && !['ASC', 'DESC'].includes(direction)) {
            throw new Error(`Invalid sort direction "${direction}" in index field "${f}"`)
          }
          validateIdentifier(fieldName, 'index field name')
          return direction ? `${fieldName} ${direction}` : fieldName
        })
        db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${validatedFields.join(', ')})`)
      } catch (err: any) {
        app.logger().error(`Failed to create index ${indexName}: ${err.message}`)
      }
    }
  }
}

import { createHash } from 'crypto'
