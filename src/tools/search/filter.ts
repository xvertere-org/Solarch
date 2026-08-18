/**
 * Solarch Query Filter Parser & AST Definition.
 *
 * Implements a formal Lexer and Recursive-Descent Parser for Solarch filter expressions.
 * Invariant: Malformed or invalid input must ALWAYS fail fast with a QueryParseError,
 * and NEVER silently compile to an empty AST or 1=1 unrestricted match.
 */

export class QueryParseError extends Error {
  constructor(message: string, public position?: number) {
    super(message)
    this.name = 'QueryParseError'
  }
}

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

export type TokenType =
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NULL'
  | 'LOGICAL_AND'
  | 'LOGICAL_OR'
  | 'NOT'
  | 'IN'
  | 'NOT_IN'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF'

export interface Token {
  type: TokenType
  value: any
  raw: string
  pos: number
}

const MAX_FILTER_LENGTH = 4096

// Multi-character comparison and pattern operators sorted by length descending (greedy longest-match)
const MULTI_CHAR_OPERATORS = [
  '?=', '?:', '?~',
  '!=', '<>', '>=', '<=',
  '!~', '!%', '!@',
]

const SINGLE_CHAR_OPERATORS = [
  '=', '>', '<', '~', '%', '@'
]

export function parseFilter(filter: string): FilterAST {
  if (!filter || !filter.trim()) {
    return { type: 'group', op: 'AND', expressions: [] }
  }
  if (filter.length > MAX_FILTER_LENGTH) {
    throw new QueryParseError(`filter expression exceeds maximum length of ${MAX_FILTER_LENGTH} characters`)
  }

  const tokens = tokenize(filter)
  const parser = new FilterParser(tokens, filter)
  const ast = parser.parse()
  return ast
}

/**
 * Lexer: Converts input string into a stream of typed tokens independently of whitespace boundaries.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let pos = 0
  const len = input.length

  while (pos < len) {
    const char = input[pos]

    // 1. Skip whitespace
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      pos++
      continue
    }

    // 2. Parentheses & Comma
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', raw: '(', pos })
      pos++
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', raw: ')', pos })
      pos++
      continue
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', raw: ',', pos })
      pos++
      continue
    }

    // 3. Quoted String literals ("..." or '...')
    if (char === '"' || char === "'") {
      const quoteChar = char
      const startPos = pos
      pos++ // skip opening quote
      let str = ''
      let escaped = false
      let closed = false

      while (pos < len) {
        const c = input[pos]
        if (escaped) {
          str += c
          escaped = false
          pos++
        } else if (c === '\\') {
          escaped = true
          pos++
        } else if (c === quoteChar) {
          closed = true
          pos++
          break
        } else {
          str += c
          pos++
        }
      }

      if (!closed) {
        throw new QueryParseError(`Unterminated string literal starting at position ${startPos}`, startPos)
      }

      tokens.push({ type: 'STRING', value: str, raw: input.slice(startPos, pos), pos: startPos })
      continue
    }

    // 4. Logical Operators (&&, ||)
    if (char === '&' && input[pos + 1] === '&') {
      tokens.push({ type: 'LOGICAL_AND', value: 'AND', raw: '&&', pos })
      pos += 2
      continue
    }
    if (char === '|' && input[pos + 1] === '|') {
      tokens.push({ type: 'LOGICAL_OR', value: 'OR', raw: '||', pos })
      pos += 2
      continue
    }

    // 5. Multi-character operators
    let matchedOp: string | null = null
    for (const op of MULTI_CHAR_OPERATORS) {
      if (input.startsWith(op, pos)) {
        matchedOp = op
        break
      }
    }
    if (matchedOp) {
      tokens.push({ type: 'OPERATOR', value: normalizeOperator(matchedOp), raw: matchedOp, pos })
      pos += matchedOp.length
      continue
    }

    // 6. Single-character operators
    for (const op of SINGLE_CHAR_OPERATORS) {
      if (input.startsWith(op, pos)) {
        matchedOp = op
        break
      }
    }
    if (matchedOp) {
      tokens.push({ type: 'OPERATOR', value: normalizeOperator(matchedOp), raw: matchedOp, pos })
      pos += matchedOp.length
      continue
    }

    // 7. Numbers (integer / float)
    // Only parse as number if preceded by non-alphanumeric or at start
    const isNumStart = (char >= '0' && char <= '9') || (char === '-' && pos + 1 < len && input[pos + 1] >= '0' && input[pos + 1] <= '9' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'OPERATOR' || tokens[tokens.length - 1].type === 'COMMA' || tokens[tokens.length - 1].type === 'LPAREN'))
    if (isNumStart) {
      const startPos = pos
      if (char === '-') pos++
      while (pos < len && input[pos] >= '0' && input[pos] <= '9') {
        pos++
      }
      if (pos < len && input[pos] === '.' && pos + 1 < len && input[pos + 1] >= '0' && input[pos + 1] <= '9') {
        pos++
        while (pos < len && input[pos] >= '0' && input[pos] <= '9') {
          pos++
        }
      }
      const numStr = input.slice(startPos, pos)
      const numVal = numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr, 10)
      tokens.push({ type: 'NUMBER', value: numVal, raw: numStr, pos: startPos })
      continue
    }

    // 8. Identifiers / Keywords / Dotted Identifiers
    if (isIdentifierStart(char)) {
      const startPos = pos
      while (pos < len && isIdentifierPart(input[pos])) {
        pos++
      }
      const word = input.slice(startPos, pos)
      const lower = word.toLowerCase()

      if (lower === 'and') {
        tokens.push({ type: 'LOGICAL_AND', value: 'AND', raw: word, pos: startPos })
      } else if (lower === 'or') {
        tokens.push({ type: 'LOGICAL_OR', value: 'OR', raw: word, pos: startPos })
      } else if (lower === 'not') {
        // Check if next non-whitespace word is 'in'
        let nextPos = pos
        while (nextPos < len && (input[nextPos] === ' ' || input[nextPos] === '\t')) nextPos++
        if (input.slice(nextPos).toLowerCase().startsWith('in') && (nextPos + 2 === len || !isIdentifierPart(input[nextPos + 2]))) {
          tokens.push({ type: 'NOT_IN', value: 'not in', raw: input.slice(startPos, nextPos + 2), pos: startPos })
          pos = nextPos + 2
        } else {
          tokens.push({ type: 'NOT', value: 'not', raw: word, pos: startPos })
        }
      } else if (lower === 'in') {
        tokens.push({ type: 'IN', value: 'in', raw: word, pos: startPos })
      } else if (lower === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true, raw: word, pos: startPos })
      } else if (lower === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false, raw: word, pos: startPos })
      } else if (lower === 'null') {
        tokens.push({ type: 'NULL', value: null, raw: word, pos: startPos })
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, raw: word, pos: startPos })
      }
      continue
    }

    // Unrecognized character
    throw new QueryParseError(`Unexpected character "${char}" at position ${pos}`, pos)
  }

  tokens.push({ type: 'EOF', value: null, raw: '', pos })
  return tokens
}

function isIdentifierStart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
}

function isIdentifierPart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_' || c === '.'
}

function normalizeOperator(op: string): string {
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
  }
  return map[op] || op
}

/**
 * Recursive-Descent Parser for Filter Grammar:
 *
 * Expr ::= OrExpr EOF
 * OrExpr ::= AndExpr ( ( "||" | "OR" ) AndExpr )*
 * AndExpr ::= UnaryExpr ( ( "&&" | "AND" ) UnaryExpr )*
 * UnaryExpr ::= ( "NOT" UnaryExpr ) | PrimaryExpr
 * PrimaryExpr ::= "(" OrExpr ")" | ComparisonExpr
 * ComparisonExpr ::= Field Operator Value
 * Field ::= IDENTIFIER
 * Value ::= Scalar | ListExpr
 * ListExpr ::= "(" Element ( "," Element )* ")"
 */
class FilterParser {
  private current = 0

  constructor(private tokens: Token[], private rawInput: string) {}

  parse(): FilterAST {
    if (this.peek().type === 'EOF') {
      return { type: 'group', op: 'AND', expressions: [] }
    }

    const ast = this.orExpression()

    if (!this.isAtEnd()) {
      const extra = this.peek()
      throw new QueryParseError(`Unexpected trailing token "${extra.raw}" at position ${extra.pos}`, extra.pos)
    }

    return ast
  }

  private orExpression(): FilterAST {
    let left = this.andExpression()

    while (this.match('LOGICAL_OR')) {
      const right = this.andExpression()
      if (left.type === 'group' && left.op === 'OR' && left.expressions) {
        left.expressions.push(right)
      } else {
        left = {
          type: 'group',
          op: 'OR',
          expressions: [left, right],
        }
      }
    }

    return left
  }

  private andExpression(): FilterAST {
    let left = this.unaryExpression()

    while (this.match('LOGICAL_AND')) {
      const right = this.unaryExpression()
      if (left.type === 'group' && left.op === 'AND' && left.expressions) {
        left.expressions.push(right)
      } else {
        left = {
          type: 'group',
          op: 'AND',
          expressions: [left, right],
        }
      }
    }

    return left
  }

  private unaryExpression(): FilterAST {
    if (this.match('NOT')) {
      const expr = this.unaryExpression()
      return {
        type: 'expression',
        field: expr.field || '',
        operator: 'not',
        value: expr.value,
      }
    }
    return this.primaryExpression()
  }

  private primaryExpression(): FilterAST {
    if (this.match('LPAREN')) {
      const startPos = this.previous().pos
      const expr = this.orExpression()
      if (!this.match('RPAREN')) {
        throw new QueryParseError(`Unclosed parenthesis opened at position ${startPos}`, startPos)
      }
      return expr
    }

    return this.comparisonExpression()
  }

  private comparisonExpression(): FilterAST {
    const fieldToken = this.consume('IDENTIFIER', 'Expected field name in comparison expression')
    const field = fieldToken.value

    // Match operator: OPERATOR, IN, NOT_IN, or identifier 'in'/'not'
    let operator = ''
    if (this.match('OPERATOR')) {
      operator = this.previous().value
    } else if (this.match('IN')) {
      operator = 'in'
    } else if (this.match('NOT_IN')) {
      operator = 'not in'
    } else {
      const next = this.peek()
      throw new QueryParseError(`Expected comparison operator after field "${field}", found "${next.raw}" at position ${next.pos}`, next.pos)
    }

    // Parse value
    if (operator === 'in' || operator === 'not in') {
      const listValue = this.listExpression()
      return {
        type: 'expression',
        field,
        operator,
        value: listValue,
      }
    }

    const value = this.scalarValue()
    return {
      type: 'expression',
      field,
      operator,
      value,
    }
  }

  private listExpression(): any[] {
    const startToken = this.consume('LPAREN', 'Expected "(" to start IN list expression')
    const items: any[] = []

    if (this.check('RPAREN')) {
      throw new QueryParseError(`Empty IN list expression is invalid at position ${startToken.pos}`, startToken.pos)
    }

    items.push(this.scalarValue())

    while (this.match('COMMA')) {
      if (this.check('RPAREN')) {
        throw new QueryParseError(`Trailing comma in list expression at position ${this.previous().pos}`, this.previous().pos)
      }
      items.push(this.scalarValue())
    }

    this.consume('RPAREN', 'Expected ")" to close IN list expression')
    return items
  }

  private scalarValue(): any {
    const token = this.peek()

    if (this.match('STRING', 'NUMBER', 'BOOLEAN', 'NULL')) {
      return this.previous().value
    }

    if (this.match('IDENTIFIER')) {
      // Unquoted identifier as literal value (e.g. status = published)
      return this.previous().value
    }

    throw new QueryParseError(`Expected literal value at position ${token.pos}, found "${token.raw}"`, token.pos)
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF'
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF'
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) return this.advance()
    const token = this.peek()
    throw new QueryParseError(`${errorMessage} at position ${token.pos} (found "${token.raw}")`, token.pos)
  }
}
