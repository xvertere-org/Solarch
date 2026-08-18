import { FilterAST } from '../../search/filter'
import { validateRelationalIdentifier } from '../../../utils/sql_safe'

const VALID_DIRECTIONS = new Set(['ASC', 'DESC'])
const MAX_FILTER_LENGTH = 4096

export class PostgresQueryBuilder {
  buildWhere(ast: FilterAST, paramOffset = 0): { where: string; params: any[] } {
    const params: any[] = []

    const walk = (node: FilterAST): string => {
      if (node.type === 'group') {
        if (!node.expressions || node.expressions.length === 0) return '1=1'
        const parts = node.expressions.map(walk)
        return `(${parts.join(` ${node.op || 'AND'} `)})`
      }

      if (node.type === 'expression') {
        const field = this.escapeField(node.field!)
        const operator = (node.operator || '=').toLowerCase()
        const value = node.value

        switch (operator) {
          case '=':
          case '==':
            params.push(value)
            return `${field} = ?`
          case '!=':
          case '<>':
            params.push(value)
            return `${field} != ?`
          case '>':
            params.push(value)
            return `${field} > ?`
          case '>=':
            params.push(value)
            return `${field} >= ?`
          case '<':
            params.push(value)
            return `${field} < ?`
          case '<=':
            params.push(value)
            return `${field} <= ?`
          case '~':
            params.push(`%${value}%`)
            return `${field} LIKE ?`
          case '!~':
            params.push(`%${value}%`)
            return `${field} NOT LIKE ?`
          case '%':
            params.push(`${value}%`)
            return `${field} LIKE ?`
          case '!%':
            params.push(`${value}%`)
            return `${field} NOT LIKE ?`
          case '@':
            params.push(`%${value}`)
            return `${field} LIKE ?`
          case '!@':
            params.push(`%${value}`)
            return `${field} NOT LIKE ?`
          case 'in':
            if (Array.isArray(value)) {
              if (value.length === 0) return '1=0'
              const placeholders = value.map(() => '?').join(', ')
              params.push(...value)
              return `${field} IN (${placeholders})`
            }
            params.push(value)
            return `${field} IN (?)`
          case 'not in':
            if (Array.isArray(value)) {
              if (value.length === 0) return '1=1'
              const placeholders = value.map(() => '?').join(', ')
              params.push(...value)
              return `${field} NOT IN (${placeholders})`
            }
            params.push(value)
            return `${field} NOT IN (?)`
          case '?=':
            params.push(value)
            return `EXISTS (SELECT 1 FROM jsonb_array_elements_text(${field}::jsonb) e WHERE e = ?)`
          case '?:':
          case '?~':
            params.push(`%${value}%`)
            return `EXISTS (SELECT 1 FROM jsonb_array_elements_text(${field}::jsonb) e WHERE e LIKE ?)`
          case 'not':
            params.push(value)
            return `NOT (${field} = ?)`
          default:
            params.push(value)
            return `${field} = ?`
        }
      }

      return '1=1'
    }

    const where = walk(ast)
    return { where, params }
  }

  buildSort(sort: string): string {
    if (!sort || !sort.trim()) return 'created DESC'
    if (sort.length > MAX_FILTER_LENGTH) {
      throw new Error(`sort expression exceeds maximum length of ${MAX_FILTER_LENGTH} characters`)
    }

    const parts = sort.split(',').map(s => {
      const trimmed = s.trim()
      if (!trimmed) {
        throw new Error('Empty sort term in sort expression')
      }

      let field: string
      let direction = 'ASC'

      if (trimmed.startsWith('-')) {
        field = trimmed.slice(1).trim()
        direction = 'DESC'
      } else if (trimmed.startsWith('+')) {
        field = trimmed.slice(1).trim()
        direction = 'ASC'
      } else {
        const tokens = trimmed.split(/\s+/)
        if (tokens.length === 1) {
          field = tokens[0]
          direction = 'ASC'
        } else if (tokens.length === 2) {
          field = tokens[0]
          const dirUpper = tokens[1].toUpperCase()
          if (!VALID_DIRECTIONS.has(dirUpper)) {
            throw new Error(`Invalid sort direction "${tokens[1]}" in sort expression "${trimmed}"`)
          }
          direction = dirUpper
        } else {
          throw new Error(`Invalid sort expression: "${trimmed}"`)
        }
      }

      validateRelationalIdentifier(field, `sort field "${field}"`)
      return `"${field}" ${direction}`
    })

    return parts.join(', ')
  }

  escapeField(field: string): string {
    validateRelationalIdentifier(field, `query field "${field}"`)
    if (field.includes('.')) {
      return field.split('.').map(p => `"${p}"`).join('.')
    }
    return `"${field}"`
  }
}