import { BaseApp } from './base'
import { RecordModel as PBRecord, RecordData } from './record'
import { Collection } from './collection'
import { parseFilter, FilterAST } from '../tools/search/filter'
import { validateIdentifier, quoteIdentifier } from '../utils/sql_safe'
import { calculateTotalPages } from '../utils/pagination'

/**
 * Sentinel value for findRecordsByFilter meaning: fetch all rows with no upper
 * bound. LIMIT -1 is valid ANSI SQL and is confirmed safe for SQLite and
 * PostgreSQL (both pass the value verbatim in a parameterized query at line 139).
 * Use this instead of a magic number to make the intent explicit at each callsite.
 */
export const NO_CANDIDATE_LIMIT = -1

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

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const row = await app.db().queryOne<any>(`SELECT * FROM ${qt} WHERE id = ?`, [recordId])
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
  const qt = quoteIdentifier(`_r_${collection.id}`)
  const rows = await app.db().query<any>(`SELECT * FROM ${qt} WHERE id IN (${placeholders})`, recordIds)

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

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const page = options.page ?? 1
  const perPage = options.perPage ?? 30
  const filter = options.filter
  const sort = options.sort

  let whereClause = ''
  let params: any[] = []

  if (filter) {
    const ast = parseFilter(filter)
    const { text: where, params: sqlParams } = app.db().getDriver().compileFilter(ast)
    if (where && where !== '1=1') {
      whereClause = `WHERE ${where}`
      params = sqlParams
    }
  }

  const orderBy = app.db().getDriver().buildSort(sort || '')
  const offset = (page - 1) * perPage

  let totalItems = 0
  let totalPages = 1

  if (!options.skipTotal) {
    const countResult = await app.db().queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM ${qt} ${whereClause}`, params)
    totalItems = countResult?.total ?? 0
    totalPages = calculateTotalPages(totalItems, perPage)
  }

  const rows = await app.db().query<any>(`SELECT * FROM ${qt} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, perPage, offset])

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
  const { text: where, params } = app.db().getDriver().compileFilter(ast)
  const whereClause = where && where !== '1=1' ? `WHERE ${where}` : ''

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const row = await app.db().queryOne<any>(`SELECT * FROM ${qt} ${whereClause} LIMIT 1`, params)
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
  const { text: where, params } = app.db().getDriver().compileFilter(ast)
  const whereClause = where && where !== '1=1' ? `WHERE ${where}` : ''

  const orderBy = app.db().getDriver().buildSort(sort)

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const rows = await app.db().query<any>(`SELECT * FROM ${qt} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, offset])

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
    const { text: where, params: sqlParams } = app.db().getDriver().compileFilter(ast)
    if (where && where !== '1=1') {
      whereClause = `WHERE ${where}`
      params = sqlParams
    }
  }

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const result = await app.db().queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM ${qt} ${whereClause}`, params)
  return result?.total ?? 0
}

export async function findAuthRecordByEmail(
  app: BaseApp,
  collectionIdOrName: string,
  email: string
): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection || !collection.isAuth()) return null

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const row = await app.db().queryOne<any>(`SELECT * FROM ${qt} WHERE email = ?`, [email])
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

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const row = await app.db().queryOne<any>(`SELECT * FROM ${qt} WHERE username = ?`, [username])
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

    const row = await app.db().queryOne<any>(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`, [payload.id])
    if (!row) return null

    return new PBRecord(collection.id, collection.name, row)
  } catch {
    return null
  }
}

export async function findRecordsByRawQuery(
  _app: BaseApp,
  _collectionIdOrName: string,
  _rawQuery: string,
  _params: any[] = []
): Promise<PBRecord[]> {
  throw new Error('findRecordsByRawQuery is disabled — use findAllRecords or findRecordsByFilter instead')
}

export async function deleteRecordById(
  app: BaseApp,
  collectionIdOrName: string,
  recordId: string
): Promise<boolean> {
  const collection = await app.findCollectionByNameOrId(collectionIdOrName)
  if (!collection) return false

  const qt = quoteIdentifier(`_r_${collection.id}`)
  const result = await app.db().execute(`DELETE FROM ${qt} WHERE id = ?`, [recordId])
  return result.rowsAffected > 0
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

  validateIdentifier(fieldName, 'vector field name')

  if (!app.db().getDriver().capabilities.vectorFunctions) {
    throw new Error('Vector search is not supported by this database provider')
  }

  const field = collection.fields.find(f => f.name === fieldName)
  if (!field || field.type !== 'vector') {
    throw new Error(`Field "${fieldName}" is not a vector field`)
  }

  const tableName = `_r_${collection.id}`
  const qt = quoteIdentifier(tableName)
  const qf = quoteIdentifier(fieldName)
  const vectorJson = JSON.stringify(queryVector)

  const minSimClause = minSimilarity !== undefined ? `AND vector_cosine_similarity(${qf}, ?) >= ?` : ''
  const minSimParams = minSimilarity !== undefined ? [vectorJson, minSimilarity] : []

  const rows = await app.db().query<any>(`
    SELECT *, vector_cosine_similarity(${qf}, ?) as similarity
    FROM ${qt}
    WHERE ${qf} IS NOT NULL AND ${qf} != ''
    ${minSimClause}
    ORDER BY similarity DESC
    LIMIT ?
  `, [vectorJson, ...minSimParams, limit])

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
