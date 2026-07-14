import { RecordModel as PBRecord } from '../core/record'
import { Collection } from '../core/collection'
import { BaseApp } from '../core/base'
import { validateIdentifier, quoteIdentifier } from '../utils/sql_safe'

export interface RequestInfo {
  auth: PBRecord | null
  isAdmin: boolean
  method: string
  headers: Record<string, string>
  query: Record<string, string>
  body: any
  data: any
  context: string
}

export interface RecordFieldResolverOptions {
  app?: BaseApp
  record?: PBRecord
  collection?: Collection
  requestInfo?: RequestInfo
  hiddenFields?: Set<string>
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180)
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export class RecordFieldResolver {
  private app: BaseApp | null
  private record: PBRecord | null
  private collection: Collection | null
  private requestInfo: RequestInfo | null
  private hiddenFields: Set<string>

  constructor(options: RecordFieldResolverOptions = {}) {
    this.app = options.app ?? null
    this.record = options.record ?? null
    this.collection = options.collection ?? null
    this.requestInfo = options.requestInfo ?? null
    this.hiddenFields = options.hiddenFields ?? new Set()
  }

  resolve(path: string): any {
    const parts = path.split('.')

    if (parts[0] === '@request') {
      return this.resolveRequest(parts.slice(1))
    }

    if (parts[0] === '@collection') {
      return this.resolveCollection(parts.slice(1))
    }

    const funcMatch = path.match(/^(\w+)\s*\((.*)\)$/)
    if (funcMatch) {
      return this.resolveFunctionCall(funcMatch[1], funcMatch[2])
    }

    if (this.record) {
      return this.resolveRecordField(parts)
    }

    return undefined
  }

  private resolveFunctionCall(name: string, argsStr: string): any {
    const args = this.parseFunctionArgs(argsStr)
    switch (name) {
      case 'geoDistance': {
        if (args.length >= 4) {
          const [lat1, lng1, lat2, lng2] = args.map(a => Number(a))
          if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
            return haversineDistance(lat1, lng1, lat2, lng2)
          }
        }
        return undefined
      }
      case 'strftime': {
        if (args.length >= 2) {
          const format = String(args[0])
          const ts = args[1]
          const date = typeof ts === 'number' ? new Date(ts) : new Date(String(ts))
          if (isNaN(date.getTime())) return ''
          let result = format
          result = result.replace('%Y', String(date.getFullYear()).padStart(4, '0'))
          result = result.replace('%m', String(date.getMonth() + 1).padStart(2, '0'))
          result = result.replace('%d', String(date.getDate()).padStart(2, '0'))
          result = result.replace('%H', String(date.getHours()).padStart(2, '0'))
          result = result.replace('%M', String(date.getMinutes()).padStart(2, '0'))
          result = result.replace('%S', String(date.getSeconds()).padStart(2, '0'))
          result = result.replace('%w', String(date.getDay()))
          result = result.replace('%s', String(Math.floor(date.getTime() / 1000)))
          return result
        }
        return ''
      }
      default:
        return undefined
    }
  }

  private parseFunctionArgs(argsStr: string): any[] {
    const args: any[] = []
    let current = ''
    let depth = 0
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i]
      if (inQuotes) {
        current += char
        if (char === quoteChar) inQuotes = false
        continue
      }
      if (char === '"' || char === "'") {
        inQuotes = true
        quoteChar = char
        current += char
        continue
      }
      if (char === '(') { depth++; current += char; continue }
      if (char === ')') { depth--; current += char; continue }
      if (char === ',' && depth === 0) {
        args.push(this.resolveFunctionArg(current.trim()))
        current = ''
        continue
      }
      current += char
    }
    if (current.trim()) args.push(this.resolveFunctionArg(current.trim()))
    return args
  }

  private resolveFunctionArg(arg: string): any {
    arg = arg.trim()
    if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1)
    if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1)
    if (/^-?\d+$/.test(arg)) return parseInt(arg, 10)
    if (/^-?\d+\.\d+$/.test(arg)) return parseFloat(arg)
    return this.resolve(arg)
  }

  private resolveRequest(parts: string[]): any {
    if (!this.requestInfo) return undefined

    if (parts[0] === 'context') return this.requestInfo.context
    if (parts[0] === 'method') return this.requestInfo.method
    if (parts[0] === 'isAdmin') return this.requestInfo.isAdmin

    if (parts[0] === 'auth') {
      if (!this.requestInfo.auth) return undefined
      if (parts.length === 1) return this.requestInfo.auth
      return this.requestInfo.auth.get(parts.slice(1).join('.'))
    }

    if (parts[0] === 'headers') {
      if (parts.length === 1) return this.requestInfo.headers
      const headerKey = parts.slice(1).join('.').toLowerCase()
      return this.requestInfo.headers[headerKey] ?? this.requestInfo.headers[parts.slice(1).join('.')]
    }

    if (parts[0] === 'query') {
      if (parts.length === 1) return this.requestInfo.query
      return this.requestInfo.query[parts.slice(1).join('.')]
    }

    if (parts[0] === 'data') {
      if (parts.length === 1) return this.requestInfo.data
      return this.resolvePath(this.requestInfo.data, parts.slice(1))
    }

    if (parts[0] === 'body') {
      if (parts.length === 1) return this.requestInfo.body
      return this.resolvePath(this.requestInfo.body, parts.slice(1))
    }

    return undefined
  }

  private resolveCollection(parts: string[]): any {
    if (!this.collection) return undefined
    if (parts[0] === 'id') return this.collection.id
    if (parts[0] === 'name') return this.collection.name
    if (parts[0] === 'type') return this.collection.type
    return undefined
  }

  private resolveRecordField(parts: string[]): any {
    if (!this.record) return undefined

    const fieldName = parts[0]
    if (this.hiddenFields.has(fieldName)) return undefined

    const backRelMatch = fieldName.match(/^(.+?)_via_(.+)$/)
    if (backRelMatch && this.app) {
      const targetCollectionName = backRelMatch[1]
      const relationFieldName = backRelMatch[2]
      const targetCollection = this.app.findCachedCollectionByNameOrId(targetCollectionName)
      if (targetCollection) {
        const targetField = targetCollection.fields.find(f => f.name === relationFieldName)
        if (!targetField || targetField.type !== 'relation') {
          return []
        }
        validateIdentifier(relationFieldName, `back-relation field "${relationFieldName}"`)
        try {
          const db = this.app.db().getDataDB()
          const qt = quoteIdentifier(`_r_${targetCollection.id}`)
          const qf = quoteIdentifier(relationFieldName)
          const rows = db.prepare(
            `SELECT * FROM ${qt} WHERE json_extract(${qf}, '$') = ? OR ${qf} LIKE ? OR ${qf} LIKE ? OR ${qf} LIKE ? LIMIT 1000`
          ).all(
            `"${this.record.id}"`,
            `%"${this.record.id}"%`,
            `${this.record.id}`,
            `%,${this.record.id},%`
          ) as any[]
          return rows.map(row => new PBRecord(targetCollection.id, targetCollection.name, row))
        } catch {
          try {
            const db = this.app.db().getDataDB()
            const qt = quoteIdentifier(`_r_${targetCollection.id}`)
            const qf = quoteIdentifier(relationFieldName)
            const rows = db.prepare(`SELECT * FROM ${qt} WHERE ${qf} = ? LIMIT 1000`).all(this.record.id) as any[]
            return rows.map(row => new PBRecord(targetCollection.id, targetCollection.name, row))
          } catch {
            return []
          }
        }
      }
      return []
    }

    const value = this.record.get(fieldName)
    if (parts.length === 1) return value

    if (typeof value === 'object' && value !== null) {
      return this.resolvePath(value, parts.slice(1))
    }

    return undefined
  }

  private resolvePath(obj: any, parts: string[]): any {
    let current = obj
    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      current = current[part]
    }
    return current
  }

  resolveWithModifier(path: string): any {
    const modifierMatch = path.match(/^(.+?)(?::([a-zA-Z]+))$/)
    if (modifierMatch) {
      const basePath = modifierMatch[1]
      const modifier = modifierMatch[2]
      const value = this.resolve(basePath)
      return this.applyModifier(value, modifier)
    }
    return this.resolve(path)
  }

  applyModifier(value: any, modifier: string): any {
    switch (modifier) {
      case 'lower':
        return typeof value === 'string' ? value.toLowerCase() : value
      case 'upper':
        return typeof value === 'string' ? value.toUpperCase() : value
      case 'length':
        if (typeof value === 'string') return value.length
        if (Array.isArray(value)) return value.length
        if (typeof value === 'object' && value !== null) return Object.keys(value).length
        return 0
      case 'isset':
        return value !== null && value !== undefined && value !== ''
      case 'each':
        if (Array.isArray(value)) return value
        if (typeof value === 'string') return [value]
        return []
      case 'excerpt':
        if (typeof value === 'string') {
          return value
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200)
        }
        return value
      case 'trim':
        return typeof value === 'string' ? value.trim() : value
      case 'abs':
        return typeof value === 'number' ? Math.abs(value) : value
      default:
        return value
    }
  }
}

export function evaluateRule(rule: string | null | undefined, resolver: RecordFieldResolver): boolean {
  if (!rule) return false
  if (rule === '') return false
  if (rule === '@request.auth.id != ""' && !resolver.resolve('@request.auth.id')) return false

  try {
    return evaluateExpression(rule, resolver)
  } catch {
    return false
  }
}

function evaluateExpression(expr: string, resolver: RecordFieldResolver): boolean {
  expr = expr.trim()

  if (!expr) return true

  if (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0
    let matchIndex = -1
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++
      if (expr[i] === ')') {
        depth--
        if (depth === 0) {
          matchIndex = i
          break
        }
      }
    }
    if (matchIndex === expr.length - 1) {
      return evaluateExpression(expr.slice(1, -1), resolver)
    }
  }

  const orParts = splitByOperator(expr, '||')
  if (orParts.length > 1) {
    return orParts.some(p => evaluateExpression(p.trim(), resolver))
  }
  const andParts = splitByOperator(expr, '&&')
  if (andParts.length > 1) {
    return andParts.every(p => evaluateExpression(p.trim(), resolver))
  }

  if (expr.startsWith('!(') && expr.endsWith(')')) {
    return !evaluateExpression(expr.slice(2, -1), resolver)
  }
  if (expr.startsWith('!')) {
    return !evaluateExpression(expr.slice(1), resolver)
  }

  const operators = ['!=', '==', '>=', '<=', '=', '>', '<', '~', '%', '@']
  for (const op of operators) {
    const parts = splitByOperator(expr, op, true)
    if (parts.length === 2) {
      const leftVal = resolveValue(parts[0].trim(), resolver)
      const rightVal = resolveValue(parts[1].trim(), resolver)
      return compareValues(leftVal, op, rightVal)
    }
  }

  if (expr.includes('?')) {
    const qIndex = expr.indexOf('?')
    const condition = expr.slice(0, qIndex).trim()
    const rest = expr.slice(qIndex + 1)
    const thenElse = rest.split(':')
    if (evaluateExpression(condition, resolver)) {
      return evaluateExpression(thenElse[0].trim(), resolver)
    }
    return thenElse.length > 1 ? evaluateExpression(thenElse[1].trim(), resolver) : false
  }

  const value = resolveValue(expr, resolver)
  return Boolean(value)
}

function splitByOperator(expr: string, op: string, onlyFirst = false): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]

    if (inQuotes) {
      current += char
      if (char === quoteChar) inQuotes = false
      continue
    }

    if (char === '"' || char === "'") {
      inQuotes = true
      quoteChar = char
      current += char
      continue
    }

    if (char === '(') {
      depth++
      current += char
      continue
    }
    if (char === ')') {
      depth--
      current += char
      continue
    }

    if (depth === 0) {
      const rest = expr.slice(i)
      if (rest.startsWith(op)) {
        parts.push(current.trim())
        if (onlyFirst) {
          parts.push(rest.slice(op.length).trim())
          return parts
        }
        current = ''
        i += op.length - 1
        continue
      }
    }

    current += char
  }

  if (current) parts.push(current.trim())
  return parts
}

function compareValues(left: any, op: string, right: any): boolean {
  switch (op) {
    case '!=':
      return left != right
    case '==':
    case '=':
      return left == right
    case '>=':
      return Number(left) >= Number(right)
    case '<=':
      return Number(left) <= Number(right)
    case '>':
      return Number(left) > Number(right)
    case '<':
      return Number(left) < Number(right)
    case '~':
      return String(left).toLowerCase().includes(String(right).toLowerCase())
    case '%':
      return String(left).startsWith(String(right))
    case '@':
      return String(left).endsWith(String(right))
    default:
      return false
  }
}

function resolveValue(expr: string, resolver: RecordFieldResolver): any {
  expr = expr.trim()

  if (expr.startsWith('"') && expr.endsWith('"')) {
    return expr.slice(1, -1)
  }

  if (expr.startsWith("'") && expr.endsWith("'")) {
    return expr.slice(1, -1)
  }

  if (expr === 'true') return true
  if (expr === 'false') return false
  if (expr === 'null') return null
  if (expr === 'undefined') return undefined

  if (/^-?\d+$/.test(expr)) return parseInt(expr, 10)
  if (/^-?\d+\.\d+$/.test(expr)) return parseFloat(expr)

  return resolver.resolveWithModifier(expr)
}
