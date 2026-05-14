import { BaseApp } from './base'
import { RecordModel as PBRecord, RecordData } from './record'
import { Collection } from './collection'
import { parseFilter, buildSQL, buildSortSQL, FilterAST, evaluateFilterAST } from '../tools/search/filter'
import { validateIdentifier } from '../utils/sql_safe'

export interface RecordQueryOptions {
  filter?: string
  sort?: string
  page?: number
  perPage?: number
  fields?: string[]
  expand?: string[]
  skipTotal?: boolean
}

export interface RecordQueryResult {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: PBRecord[]
}

export async function findRecordById(
  app: BaseApp,
  collectionIdOrName: string,
  recordId: string
): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return null

  const db = app.db().getDataDB()
  const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(recordId) as any
  if (!row) return null

  return new PBRecord(collection.id, collection.name, row)
}

export async function findRecordsByIds(
  app: BaseApp,
  collectionIdOrName: string,
  recordIds: string[]
): Promise<PBRecord[]> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection || recordIds.length === 0) return []

  const placeholders = recordIds.map(() => '?').join(',')
  const db = app.db().getDataDB()
  const rows = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id IN (${placeholders})`).all(...recordIds) as any[]

  return rows.map(row => new PBRecord(collection.id, collection.name, row))
}

export async function findAllRecords(
  app: BaseApp,
  collectionIdOrName: string,
  options: RecordQueryOptions = {}
): Promise<RecordQueryResult> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) {
    return { page: 1, perPage: 0, totalItems: 0, totalPages: 0, items: [] }
  }

  const db = app.db().getDataDB()
  const page = options.page ?? 1
  const perPage = options.perPage ?? 30
  const filter = options.filter
  const sort = options.sort

  let whereClause = ''
  let params: any[] = []

  if (filter) {
    const ast = parseFilter(filter)
    const { where, params: sqlParams } = buildSQL(ast)
    if (where && where !== '1=1') {
      whereClause = `WHERE ${where}`
      params = sqlParams
    }
  }

  const orderBy = buildSortSQL(sort || '')
  const offset = (page - 1) * perPage

  let totalItems = 0
  let totalPages = 1

  if (!options.skipTotal) {
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM _r_${collection.id} ${whereClause}`).get(...params) as { total: number }
    totalItems = countResult.total
    totalPages = Math.ceil(totalItems / perPage) || 1
  }

  const rows = db.prepare(`SELECT * FROM _r_${collection.id} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, perPage, offset) as any[]

  const items = rows.map(row => new PBRecord(collection.id, collection.name, row))
  return { page, perPage, totalItems, totalPages, items }
}

export async function findFirstRecordByFilter(
  app: BaseApp,
  collectionIdOrName: string,
  filter: string
): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return null

  const ast = parseFilter(filter)
  const { where, params } = buildSQL(ast)
  const whereClause = where && where !== '1=1' ? `WHERE ${where}` : ''

  const db = app.db().getDataDB()
  const row = db.prepare(`SELECT * FROM _r_${collection.id} ${whereClause} LIMIT 1`).get(...params) as any
  if (!row) return null

  return new PBRecord(collection.id, collection.name, row)
}

export async function findRecordsByFilter(
  app: BaseApp,
  collectionIdOrName: string,
  filter: string,
  sort: string = '',
  limit: number = 30,
  offset: number = 0
): Promise<PBRecord[]> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return []

  const ast = parseFilter(filter)
  const { where, params } = buildSQL(ast)
  const whereClause = where && where !== '1=1' ? `WHERE ${where}` : ''

  const orderBy = buildSortSQL(sort)

  const db = app.db().getDataDB()
  const rows = db.prepare(`SELECT * FROM _r_${collection.id} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as any[]

  return rows.map(row => new PBRecord(collection.id, collection.name, row))
}

export async function countRecords(
  app: BaseApp,
  collectionIdOrName: string,
  filter?: string
): Promise<number> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return 0

  let whereClause = ''
  let params: any[] = []

  if (filter) {
    const ast = parseFilter(filter)
    const { where, params: sqlParams } = buildSQL(ast)
    if (where && where !== '1=1') {
      whereClause = `WHERE ${where}`
      params = sqlParams
    }
  }

  const db = app.db().getDataDB()
  const result = db.prepare(`SELECT COUNT(*) as total FROM _r_${collection.id} ${whereClause}`).get(...params) as { total: number }
  return result.total
}

export async function findAuthRecordByEmail(
  app: BaseApp,
  collectionIdOrName: string,
  email: string
): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection || !collection.isAuth()) return null

  const db = app.db().getDataDB()
  const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE email = ?`).get(email) as any
  if (!row) return null

  return new PBRecord(collection.id, collection.name, row)
}

export async function findAuthRecordByUsername(
  app: BaseApp,
  collectionIdOrName: string,
  username: string
): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection || !collection.isAuth()) return null

  const db = app.db().getDataDB()
  const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE username = ?`).get(username) as any
  if (!row) return null

  return new PBRecord(collection.id, collection.name, row)
}

export async function findAuthRecordByToken(
  app: BaseApp,
  token: string,
  validTypes: string[] = ['auth', 'file', 'verifyEmail', 'changeEmail', 'passwordReset']
): Promise<PBRecord | null> {
  try {
    const secret = app.getJwtSecret()
    const payload = app.parseJWT(token, secret)
    if (!payload) return null

    const tokenType = payload.type
    if (!validTypes.includes(tokenType)) return null

    const collection = await app.findCollectionByNameOrId(payload.collectionId)
    if (!collection) return null

    const db = app.db().getDataDB()
    const row = db.prepare(`SELECT * FROM _r_${collection.id} WHERE id = ?`).get(payload.id) as any
    if (!row) return null

    return new PBRecord(collection.id, collection.name, row)
  } catch {
    return null
  }
}

// FIXED[M-1]: Guarded against SQL injection — only allows single SELECT statements
export async function findRecordsByRawQuery(
  app: BaseApp,
  collectionIdOrName: string,
  rawQuery: string,
  params: any[] = []
): Promise<PBRecord[]> {
  const trimmed = rawQuery.trim().toLowerCase()
  if (!trimmed.startsWith('select') || trimmed.includes(';')) {
    throw new Error('Raw query must be a single SELECT statement')
  }
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return []

  const db = app.db().getDataDB()
  const rows = db.prepare(rawQuery).all(...params) as any[]
  return rows.map(row => new PBRecord(collection.id, collection.name, row))
}

export async function deleteRecordById(
  app: BaseApp,
  collectionIdOrName: string,
  recordId: string
): Promise<boolean> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return false

  const db = app.db().getDataDB()
  const result = db.prepare(`DELETE FROM _r_${collection.id} WHERE id = ?`).run(recordId)
  return result.changes > 0
}

export interface VectorSearchResult {
  record: PBRecord
  similarity: number
}

export async function vectorSearch(
  app: BaseApp,
  collectionIdOrName: string,
  fieldName: string,
  queryVector: number[],
  limit: number = 10,
  minSimilarity?: number
): Promise<VectorSearchResult[]> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return []

  // Validate field name to prevent SQL injection
  // FIXED[L-2]: Use shared validateIdentifier instead of inline regex
  validateIdentifier(fieldName, 'vector field name')

  const field = collection.fields.find(f => f.name === fieldName)
  if (!field || field.type !== 'vector') {
    throw new Error(`Field "${fieldName}" is not a vector field`)
  }

  const db = app.db().getDataDB()
  const tableName = `_r_${collection.id}`
  const vectorJson = JSON.stringify(queryVector)

  const minSimClause = minSimilarity !== undefined ? `AND vector_cosine_similarity(${fieldName}, ?) >= ?` : ''
  const minSimParams = minSimilarity !== undefined ? [vectorJson, minSimilarity] : []

  const rows = db.prepare(`
    SELECT *, vector_cosine_similarity(${fieldName}, ?) as similarity
    FROM ${tableName}
    WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''
    ${minSimClause}
    ORDER BY similarity DESC
    LIMIT ?
  `).all(vectorJson, ...minSimParams, limit) as any[]

  return rows.map(row => {
    const similarity = row.similarity as number
    const recordData = { ...row }
    delete recordData.similarity
    return {
      record: new PBRecord(collection.id, collection.name, recordData),
      similarity,
    }
  })
}
