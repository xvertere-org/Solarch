export interface FilterExpression {
  field: string
  operator: string
  value: any
}

export interface FilterAST {
  type: 'group' | 'expression'
  op?: 'AND' | 'OR'
  expressions?: FilterAST[]
  field?: string
  operator?: string
  value?: any
}

// FIXED[M-4]: Reject filter expressions exceeding maximum safe length
const MAX_FILTER_LENGTH = 4096

export function parseFilter(filter: string): FilterAST {
  if (!filter || !filter.trim()) {
    return { type: 'group', op: 'AND', expressions: [] }
  }
  if (filter.length > MAX_FILTER_LENGTH) {
    throw new Error(`filter expression exceeds maximum length of ${MAX_FILTER_LENGTH} characters`)
  }
  const tokens = tokenize(filter)
  const { ast } = parseExpression(tokens, 0)
  return ast
}

function tokenize(filter: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < filter.length; i++) {
    const char = filter[i]

    if (inQuotes) {
      current += char
      if (char === quoteChar) {
        inQuotes = false
        tokens.push(current)
        current = ''
      }
      continue
    }

    if (char === '"' || char === "'") {
      if (current) {
        tokens.push(current)
        current = ''
      }
      inQuotes = true
      quoteChar = char
      current = char
      continue
    }

    if (char === '(' || char === ')') {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
      continue
    }

    if (char === ' ' || char === '\t') {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function parseExpression(tokens: string[], pos: number): { ast: FilterAST; nextPos: number } {
  const expressions: FilterAST[] = []
  let currentPos = pos

  while (currentPos < tokens.length) {
    const token = tokens[currentPos]

    if (token === ')') {
      currentPos++
      break
    }

    if (token === '(') {
      const { ast: groupAst, nextPos } = parseExpression(tokens, currentPos + 1)
      expressions.push(groupAst)
      currentPos = nextPos
      continue
    }

    if (token.toUpperCase() === '&&' || token.toUpperCase() === 'AND') {
      currentPos++
      continue
    }

    if (token.toUpperCase() === '||' || token.toUpperCase() === 'OR') {
      currentPos++
      continue
    }

    // Parse a single expression: field operator value
    if (currentPos + 2 < tokens.length) {
      const field = token
      const op = tokens[currentPos + 1]
      const value = tokens[currentPos + 2]

      const operator = normalizeOperator(op)
      if (operator) {
        expressions.push({
          type: 'expression',
          field,
          operator,
          value: parseValue(value),
        })
        currentPos += 3
        continue
      }
    }

    // Handle multi-word operators like !=, >=, <=, !~, etc.
    if (currentPos + 1 < tokens.length) {
      const field = token
      const combined = tokens[currentPos + 1]
      const operator = normalizeOperator(combined)
      if (operator && currentPos + 2 < tokens.length) {
        expressions.push({
          type: 'expression',
          field,
          operator,
          value: parseValue(tokens[currentPos + 2]),
        })
        currentPos += 3
        continue
      }
    }

    currentPos++
  }

  if (expressions.length === 1) {
    return { ast: expressions[0], nextPos: currentPos }
  }

  return {
    ast: { type: 'group', op: 'AND', expressions },
    nextPos: currentPos,
  }
}

function normalizeOperator(op: string): string | null {
  const map: Record<string, string> = {
    '=': '=',
    '==': '=',
    '!=': '!=',
    '<>': '!=',
    '>': '>',
    '>=': '>=',
    '<': '<',
    '<=': '<=',
    '~': '~',
    '!~': '!~',
    '%': '%',
    '!%': '!%',
    '@': '@',
    '!@': '!@',
    '?=': '?=',
    '?:': '?:',
    '?~': '?~',
    'IN': 'in',
    'in': 'in',
    'NOT': 'not',
    'not': 'not',
  }
  return map[op] || null
}

function parseValue(value: string): any {
  if (!value) return ''
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+$/.test(value)) return parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  return value
}
