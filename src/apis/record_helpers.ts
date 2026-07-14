import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { Collection } from '../core/collection'
import { evaluateRule, RecordFieldResolver, RequestInfo } from '../core/record_field_resolver'
import { findAllMFAsByRecord, findAllOTPsByRecord, findAllAuthOriginsByRecord, findAllExternalAuthsByRecord } from '../core/auth_queries'
import { quoteIdentifier } from '../utils/sql_safe'

export interface EnrichOptions {
  expands?: string[]
  fields?: string[]
  requestInfo?: RequestInfo
}

export async function enrichRecord(
  app: BaseApp,
  collection: Collection,
  record: PBRecord,
  options: EnrichOptions = {}
): Promise<PBRecord> {
  const requestInfo = options.requestInfo ?? {
    auth: null,
    isAdmin: false,
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    data: {},
    context: 'list',
  }

  const resolver = new RecordFieldResolver({
    record,
    collection,
    requestInfo,
  })

  if (collection.isAuth()) {
    record.hide('passwordHash')
    record.hide('lastResetSentAt')
    record.hide('lastVerificationSentAt')

    if (!requestInfo.isAdmin && record.get('emailVisibility') !== true) {
      record.hide('email')
    }
  }

  if (options.expands && options.expands.length > 0) {
    const expandData = await expandRecord(app, record, options.expands)
    ;(record as any)._expand = expandData
  }

  if (options.fields && options.fields.length > 0) {
    for (const key of record.keys()) {
      if (!options.fields.includes(key) && !['id', 'created', 'updated', 'collectionId', 'collectionName'].includes(key)) {
        record.hide(key)
      }
    }
  }

  await app.onRecordEnrich.triggerForTag(collection.id, { app, record, requestInfo })

  return record
}

export async function enrichRecords(
  app: BaseApp,
  collection: Collection,
  records: PBRecord[],
  options: EnrichOptions = {}
): Promise<PBRecord[]> {
  return Promise.all(records.map(record => enrichRecord(app, collection, record, options)))
}

export async function expandRecord(
  app: BaseApp,
  record: PBRecord,
  expands: string[]
): Promise<Record<string, any>> {
  const expandData: Record<string, any> = {}

  for (const expandPath of expands) {
    const parts = expandPath.split('.')
    const fieldName = parts[0]

    const field = record.get(fieldName)
    if (!field) continue

    const collection = await app.findCollectionByNameOrId(fieldName)
    if (!collection) continue

    const ids = Array.isArray(field) ? field : [field]
    const records = await Promise.all(
      ids.map(id => findRecordById(app, collection.id, id))
    )

    const filtered = records.filter(r => r !== null)

    if (parts.length > 1) {
      const nestedExpands = [parts.slice(1).join('.')]
      const nestedResults = await Promise.all(
        filtered.map(r => expandRecord(app, r!, nestedExpands))
      )
      filtered.forEach((r, i) => {
        if (r) {
          ;(r as any)._expand = nestedResults[i]
        }
      })
    }

    expandData[fieldName] = filtered.length === 1 ? filtered[0] : filtered
  }

  return expandData
}

async function findRecordById(app: BaseApp, collectionId: string, recordId: string): Promise<PBRecord | null> {
  const collection = await app.findCollectionByNameOrId(collectionId)
  if (!collection) return null

  const db = app.db().getDataDB()
  const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(recordId) as any
  if (!row) return null

  return new PBRecord(collection.id, collection.name, row)
}

export async function canAccessRecord(
  app: BaseApp,
  record: PBRecord,
  collection: Collection,
  rule: string | null | undefined,
  requestInfo: RequestInfo,
  skipAdminBypass = false
): Promise<boolean> {
  if (!skipAdminBypass && requestInfo.isAdmin) {
    return true
  }

  if (rule === '') return true
  if (!rule) return false

  const resolver = new RecordFieldResolver({
    record,
    collection,
    requestInfo,
  })

  return evaluateRule(rule, resolver)
}

export async function checkCollectionAccess(
  app: BaseApp,
  collection: Collection,
  action: 'list' | 'view' | 'create' | 'update' | 'delete',
  record: PBRecord | null,
  requestInfo: RequestInfo
): Promise<boolean> {
  if (requestInfo.isAdmin) return true

  let rule: string | null | undefined
  switch (action) {
    case 'list':
      rule = collection.listRule
      break
    case 'view':
      rule = collection.viewRule
      break
    case 'create':
      rule = collection.createRule
      break
    case 'update':
      rule = collection.updateRule
      break
    case 'delete':
      rule = collection.deleteRule
      break
  }

  if (rule === null) return false
  if (rule === '') return true

  if (!record) return false

  return canAccessRecord(app, record, collection, rule, requestInfo)
}
