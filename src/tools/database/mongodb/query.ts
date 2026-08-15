import { QueryDriver, Row, ExecuteResult } from '../types'
import { MongoConnection } from './connection'
import { normalizeDocument, prepareDocumentForInsert } from './mapping'
import { normalizeMongoError } from './errors'
import { DatabaseError, DatabaseErrorCode } from '../errors'

/**
 * Strips SQL quotes, double quotes, backticks, or square brackets from an identifier.
 */
function cleanIdentifier(id: string): string {
  return id.trim().replace(/^["`'\[](.*)["`'\]]$/, '$1')
}

export class MongoQueryExecutor implements QueryDriver {
  private conn: MongoConnection

  constructor(conn: MongoConnection) {
    this.conn = conn
  }

  async query(sql: string, params: unknown[] = []): Promise<Row[]> {
    try {
      const db = this.conn.getDb()
      const session = this.conn.getSession()
      const options = session ? { session } : {}
      const trimmed = sql.trim()

      // 1. Check for SELECT COUNT(*)
      const countMatch = trimmed.match(/^SELECT\s+COUNT\(\*\)\s+(?:as\s+(\w+)\s+)?FROM\s+([^\s;]+)(?:\s+WHERE\s+(.*))?$/i)
      if (countMatch) {
        const alias = countMatch[1] || 'c'
        const table = cleanIdentifier(countMatch[2])
        const whereClause = countMatch[3]
        const filter = this.buildFilterFromWhere(whereClause, params)
        const total = await db.collection(table).countDocuments(filter, options)
        const res: Row = { total, count: total }
        res[alias] = total
        return [res]
      }

      // 2. Check for SELECT ... FROM ...
      const selectMatch = trimmed.match(/^SELECT\s+(.*?)\s+FROM\s+([^\s;]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(.*?))?$/i)
      if (selectMatch) {
        const table = cleanIdentifier(selectMatch[2])
        const whereClause = selectMatch[3]
        const orderClause = selectMatch[4]
        const limitClause = selectMatch[5]

        // Schema validation: check if table collection exists
        const collections = await db.listCollections({ name: table }).toArray()
        if (collections.length === 0 && !table.startsWith('_')) {
          throw new DatabaseError(
            DatabaseErrorCode.DATABASE_SCHEMA_ERROR,
            `Collection "${table}" does not exist.`,
            { retryable: false }
          )
        }

        const filter = whereClause ? this.buildFilterFromWhere(whereClause, params) : {}

        let cursor = db.collection(table).find(filter, options)

        // Sorting
        if (orderClause) {
          const sortSpec = this.parseSort(orderClause)
          cursor = cursor.sort(sortSpec)
        }

        // Limit & Offset
        if (limitClause) {
          const limitOffset = this.parseLimitOffset(limitClause, params)
          if (limitOffset.skip !== undefined && limitOffset.skip > 0) {
            cursor = cursor.skip(limitOffset.skip)
          }
          if (limitOffset.limit !== undefined && limitOffset.limit > 0) {
            cursor = cursor.limit(limitOffset.limit)
          }
        }

        const docs = await cursor.toArray()
        return docs.map(normalizeDocument)
      }

      // Fallback: Empty result for unrecognized SELECT queries
      return []
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async queryOne(sql: string, params: unknown[] = []): Promise<Row | null> {
    try {
      const rows = await this.query(sql, params)
      return rows.length > 0 ? rows[0] : null
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    try {
      const db = this.conn.getDb()
      const session = this.conn.getSession()
      const options = session ? { session } : {}
      const trimmed = sql.trim()

      // 1. INSERT INTO <table> (cols...) VALUES (vals...)
      const insertMatch = trimmed.match(/^INSERT\s+INTO\s+([^\s(]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)$/i)
      if (insertMatch) {
        const table = cleanIdentifier(insertMatch[1])
        const cols = insertMatch[2].split(',').map(c => cleanIdentifier(c))
        
        const doc: Record<string, any> = {}
        for (let i = 0; i < cols.length; i++) {
          doc[cols[i]] = params[i] !== undefined ? params[i] : null
        }

        const prepared = prepareDocumentForInsert(doc)
        const result = await db.collection(table).insertOne(prepared, options)
        return {
          changes: result.acknowledged ? 1 : 0,
          rowsAffected: result.acknowledged ? 1 : 0,
        }
      }

      // 2. UPDATE <table> SET <sets> WHERE <where>
      const updateMatch = trimmed.match(/^UPDATE\s+([^\s]+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$/i)
      if (updateMatch) {
        const table = cleanIdentifier(updateMatch[1])
        const setClause = updateMatch[2]
        const whereClause = updateMatch[3]

        const setAssignments = setClause.split(',').map(s => s.trim())
        const updateDoc: Record<string, any> = {}
        let pIdx = 0

        for (const assign of setAssignments) {
          const parts = assign.split('=').map(s => s.trim())
          const col = cleanIdentifier(parts[0])
          const rawVal = parts[1] ? parts[1].trim() : '?'
          if (rawVal.toUpperCase() === 'NULL') {
            updateDoc[col] = null
          } else if (rawVal === '?') {
            updateDoc[col] = params[pIdx++]
          } else if (rawVal.startsWith("'") || rawVal.startsWith('"')) {
            updateDoc[col] = rawVal.slice(1, -1)
          } else if (!isNaN(Number(rawVal))) {
            updateDoc[col] = Number(rawVal)
          } else {
            updateDoc[col] = params[pIdx++]
          }
        }

        const remainingParams = params.slice(pIdx)
        const filter = this.buildFilterFromWhere(whereClause, remainingParams)

        const result = await db.collection(table).updateMany(filter, { $set: updateDoc }, options)
        return {
          changes: result.modifiedCount,
          rowsAffected: result.matchedCount,
        }
      }

      // 3. DELETE FROM <table> WHERE <where>
      const deleteMatch = trimmed.match(/^DELETE\s+FROM\s+([^\s]+)(?:\s+WHERE\s+(.*))?$/i)
      if (deleteMatch) {
        const table = cleanIdentifier(deleteMatch[1])
        const whereClause = deleteMatch[2]
        const filter = this.buildFilterFromWhere(whereClause, params)

        const result = await db.collection(table).deleteMany(filter, options)
        return {
          changes: result.deletedCount,
          rowsAffected: result.deletedCount,
        }
      }

      return { changes: 0, rowsAffected: 0 }
    } catch (err) {
      throw normalizeMongoError(err)
    }
  }

  private buildFilterFromWhere(whereClause?: string, params: unknown[] = []): Record<string, any> {
    if (!whereClause || !whereClause.trim()) {
      return {}
    }

    const trimmed = whereClause.trim()

    // Handle JSON-encoded MongoDB filter from MongoDialect.compileFilter
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        // continue
      }
    }

    let pIdx = 0
    const andParts = trimmed.split(/\s+AND\s+/i)
    const andFilters: Record<string, any>[] = []

    for (const part of andParts) {
      const p = part.trim()

      const gteMatch = p.match(/^([a-zA-Z0-9_]+)\s*>=\s*\?$/i)
      if (gteMatch) {
        andFilters.push({ [cleanIdentifier(gteMatch[1])]: { $gte: params[pIdx++] } })
        continue
      }

      const lteMatch = p.match(/^([a-zA-Z0-9_]+)\s*<=\s*\?$/i)
      if (lteMatch) {
        andFilters.push({ [cleanIdentifier(lteMatch[1])]: { $lte: params[pIdx++] } })
        continue
      }

      const gtMatch = p.match(/^([a-zA-Z0-9_]+)\s*>\s*\?$/i)
      if (gtMatch) {
        andFilters.push({ [cleanIdentifier(gtMatch[1])]: { $gt: params[pIdx++] } })
        continue
      }

      const ltMatch = p.match(/^([a-zA-Z0-9_]+)\s*<\s*\?$/i)
      if (ltMatch) {
        andFilters.push({ [cleanIdentifier(ltMatch[1])]: { $lt: params[pIdx++] } })
        continue
      }

      const neMatch = p.match(/^([a-zA-Z0-9_]+)\s*(?:!=|<>)\s*\?$/i)
      if (neMatch) {
        andFilters.push({ [cleanIdentifier(neMatch[1])]: { $ne: params[pIdx++] } })
        continue
      }

      const likeMatch = p.match(/^([a-zA-Z0-9_]+)\s+LIKE\s+\?$/i)
      if (likeMatch) {
        const val = String(params[pIdx++])
        const regexStr = val.replace(/^%|%$/g, '')
        andFilters.push({ [cleanIdentifier(likeMatch[1])]: { $regex: regexStr, $options: 'i' } })
        continue
      }

      const inMatch = p.match(/^([a-zA-Z0-9_]+)\s+IN\s*\((.*?)\)$/i)
      if (inMatch) {
        const count = inMatch[2].split(',').length
        const inParams = params.slice(pIdx, pIdx + count)
        pIdx += count
        andFilters.push({ [cleanIdentifier(inMatch[1])]: { $in: inParams } })
        continue
      }

      const eqMatch = p.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/i)
      if (eqMatch) {
        andFilters.push({ [cleanIdentifier(eqMatch[1])]: params[pIdx++] })
        continue
      }
    }

    if (andFilters.length === 0) return {}
    if (andFilters.length === 1) return andFilters[0]
    return { $and: andFilters }
  }

  private parseSort(orderClause: string): Record<string, 1 | -1> {
    const trimmed = orderClause.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        // continue
      }
    }

    const sortSpec: Record<string, 1 | -1> = {}
    const parts = trimmed.split(',').map(s => s.trim())
    for (const part of parts) {
      const [field, dir] = part.split(/\s+/)
      const cleanField = cleanIdentifier(field)
      sortSpec[cleanField] = dir && dir.toUpperCase() === 'DESC' ? -1 : 1
    }
    return sortSpec
  }

  private parseLimitOffset(limitClause: string, params: unknown[]): { limit?: number; skip?: number } {
    const trimmed = limitClause.trim()
    // Pattern: ? OFFSET ?
    if (/^\?\s+OFFSET\s+\?$/i.test(trimmed)) {
      const offsetParam = params[params.length - 1]
      const limitParam = params[params.length - 2]
      return {
        limit: typeof limitParam === 'number' ? limitParam : parseInt(String(limitParam), 10),
        skip: typeof offsetParam === 'number' ? offsetParam : parseInt(String(offsetParam), 10),
      }
    }

    // Pattern: 1 (e.g. LIMIT 1)
    const num = parseInt(trimmed, 10)
    if (!isNaN(num)) {
      return { limit: num }
    }

    return {}
  }
}
