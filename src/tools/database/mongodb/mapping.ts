import { Row } from '../types'

/**
 * Normalizes a raw MongoDB document into a canonical Solarch Row.
 * Guarantees zero leakage of `_id`, `ObjectId`, `Decimal128`, or BSON wrappers.
 */
export function normalizeDocument(doc: any): Row {
  if (!doc || typeof doc !== 'object') return doc

  const normalized: Row = {}

  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') {
      // If doc has no top-level 'id' but has '_id', map it
      if (!('id' in doc) && value != null) {
        normalized.id = normalizeValue(value)
      }
      // Never include '_id' in the normalized output
      continue
    }

    normalized[key] = normalizeValue(value)
  }

  return normalized
}

/**
 * Recursively converts BSON / complex types into pure JSON-serializable values.
 */
export function normalizeValue(val: any): any {
  if (val === null || val === undefined) {
    return val
  }

  // ObjectId / Stringifiable BSON objects
  if (typeof val === 'object' && val._bsontype) {
    switch (val._bsontype) {
      case 'ObjectId':
        return val.toHexString ? val.toHexString() : String(val)
      case 'Decimal128':
      case 'Long':
        return val.toString ? val.toString() : String(val)
      case 'Binary':
        return val.buffer ? Buffer.from(val.buffer).toString('base64') : String(val)
      case 'Timestamp':
        return val.toString ? val.toString() : String(val)
      default:
        return val.toString ? val.toString() : val
    }
  }

  if (val instanceof Date) {
    return val.toISOString().replace('T', ' ').substring(0, 19)
  }

  if (Array.isArray(val)) {
    return val.map(normalizeValue)
  }

  if (typeof val === 'object') {
    const obj: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) {
      if (k !== '_id') {
        obj[k] = normalizeValue(v)
      }
    }
    return obj
  }

  return val
}

/**
 * Prepares a Solarch record for insertion / update in MongoDB.
 */
export function prepareDocumentForInsert(data: Record<string, any>): Record<string, any> {
  const doc: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key === '_id') continue

    if (value === undefined) {
      continue
    }

    // Dates stored as standard strings or ISO
    if (value instanceof Date) {
      doc[key] = value.toISOString()
    } else {
      doc[key] = value
    }
  }

  return doc
}
