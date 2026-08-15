import { FilterAST } from '../../search/filter'

/**
 * Escapes regex special characters to prevent ReDoS / injection when compiling ~ / !~ operators.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sanitizes and validates a field name.
 * Rejects any leading `$` or property traversal attempting operator injection.
 */
function sanitizeField(field: string): string {
  const trimmed = field.trim()
  if (!trimmed || trimmed.startsWith('$') || trimmed.includes('__proto__') || trimmed.includes('constructor')) {
    throw new Error(`Invalid or dangerous field name in filter: "${field}"`)
  }
  return trimmed
}

/**
 * Compiles a Solarch FilterAST into a native MongoDB query document.
 */
export function compileMongoFilter(ast: FilterAST): Record<string, any> {
  if (!ast || !ast.type) {
    return {}
  }

  if (ast.type === 'group') {
    if (!ast.expressions || ast.expressions.length === 0) {
      return {}
    }

    const compiledExprs = ast.expressions
      .map(expr => compileMongoFilter(expr))
      .filter(doc => Object.keys(doc).length > 0)

    if (compiledExprs.length === 0) {
      return {}
    }

    if (compiledExprs.length === 1) {
      return compiledExprs[0]
    }

    if (ast.op === 'OR') {
      return { $or: compiledExprs }
    }

    return { $and: compiledExprs }
  }

  if (ast.type === 'expression') {
    const field = sanitizeField(ast.field ?? '')
    const op = ast.operator ?? '='
    let val = ast.value

    // Cast string representations of booleans / numbers / null
    if (typeof val === 'string') {
      const lower = val.toLowerCase()
      if (lower === 'true') val = true
      else if (lower === 'false') val = false
      else if (lower === 'null') val = null
    }

    if (typeof val === 'boolean') {
      if (op === '=') {
        return { [field]: { $in: [val, val ? 1 : 0] } }
      }
      if (op === '!=') {
        return { [field]: { $nin: [val, val ? 1 : 0] } }
      }
    }

    switch (op) {
      case '=':
        return { [field]: { $eq: val } }
      case '!=':
        return { [field]: { $ne: val } }
      case '>':
        return { [field]: { $gt: val } }
      case '>=':
        return { [field]: { $gte: val } }
      case '<':
        return { [field]: { $lt: val } }
      case '<=':
        return { [field]: { $lte: val } }
      case '~':
        return { [field]: { $regex: typeof val === 'string' ? escapeRegex(val) : String(val), $options: 'i' } }
      case '!~':
        return { [field]: { $not: { $regex: typeof val === 'string' ? escapeRegex(val) : String(val), $options: 'i' } } }
      case 'in':
      case '?=':
        return { [field]: { $in: Array.isArray(val) ? val : [val] } }
      case '?!=':
        return { [field]: { $nin: Array.isArray(val) ? val : [val] } }
      default:
        return { [field]: { $eq: val } }
    }
  }

  return {}
}
