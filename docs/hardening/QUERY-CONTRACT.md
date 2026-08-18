# Solarch Canonical Query Contract (`QUERY-CONTRACT.md`)

This document defines the formal grammar, canonical operator registry, AST structure, and compilation rules for the Solarch filter and sort query engine.

---

## 1. Lexical Tokenization

The lexer converts raw filter strings into a sequence of strongly-typed tokens independently of whitespace boundaries:

### Token Types
- `IDENTIFIER`: `[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*` (e.g. `status`, `views`, `author.name`)
- `OPERATOR`: Canonical comparison and matching operators
- `STRING`: Single or double quoted strings with escape support (e.g. `"published"`, `'Alice\'s blog'`)
- `NUMBER`: Integer or floating point numbers (e.g. `42`, `-10`, `3.14`)
- `BOOLEAN`: `true` | `false`
- `NULL`: `null`
- `LPAREN`: `(`
- `RPAREN`: `)`
- `COMMA`: `,`
- `LOGICAL_OP`: `&&` | `AND` | `and` | `||` | `OR` | `or`

---

## 2. Canonical Operator Registry

Operators are matched using greedy longest-match precedence:

| Operator | Syntax | Semantics | Compiled SQL (SQLite / Postgres) |
| :--- | :--- | :--- | :--- |
| **Equality** | `=`, `==` | Exact equality | `field = ?` |
| **Inequality** | `!=`, `<>` | Inequality | `field != ?` |
| **Greater Than** | `>` | Strict greater than | `field > ?` |
| **Greater / Equal** | `>=` | Greater than or equal | `field >= ?` |
| **Less Than** | `<` | Strict less than | `field < ?` |
| **Less / Equal** | `<=` | Less than or equal | `field <= ?` |
| **Substring Match** | `~` | Case-insensitive substring | `field LIKE ?` with `'%val%'` |
| **Negative Substring** | `!~` | Case-insensitive negative substring | `field NOT LIKE ?` with `'%val%'` |
| **Prefix Match** | `%` | Prefix match | `field LIKE ?` with `'val%'` |
| **Negative Prefix** | `!%` | Negative prefix match | `field NOT LIKE ?` with `'val%'` |
| **Suffix Match** | `@` | Suffix match | `field LIKE ?` with `'%val'` |
| **Negative Suffix** | `!@` | Negative suffix match | `field NOT LIKE ?` with `'%val'` |
| **Set Inclusion** | `in`, `IN` | Inclusion in literal list | `field IN (?, ?, ...)` |
| **Set Exclusion** | `not in`, `NOT IN` | Exclusion from literal list | `field NOT IN (?, ?, ...)` |
| **JSON Array Value** | `?=` | Exact value in JSON array | `EXISTS (SELECT 1 FROM json_each(field) WHERE value = ?)` |
| **JSON Array Pattern** | `?:`, `?~` | Pattern match in JSON array | `EXISTS (SELECT 1 FROM json_each(field) WHERE CAST(value AS TEXT) LIKE ?)` |

---

## 3. List Expression & Empty `IN` Semantics

### Grammar
```text
ListExpression ::= "(" ( Value ( "," Value )* )? ")"
```

### Rules
1. **User Parser Level**:
   - `id in ("a", "b", "c")` -> Valid -> `value: ["a", "b", "c"]`
   - `id in ()` -> Syntax Error -> Throws `QueryParseError("Empty IN list expression is invalid")`
   - Malformed list syntax (`id in ("a",)`, `id in ("a" "b")`) -> Syntax Error -> Throws `QueryParseError`
2. **Compiler Level (Programmatic AST Safeguard)**:
   - If an AST node containing `operator: 'in'` and `value: []` is received programmatically, the SQL compiler compiles it deterministically to `1=0` (false), guaranteeing it never broadens to `1=1`.

---

## 4. Relational Identifier Semantics

### Syntax
- Single identifier: `author`
- Relational path: `author.name`, `author.profile.avatar`

### Validation Rule
Every segment of a dotted path must satisfy `^[a-zA-Z_][a-zA-Z0-9_]{0,62}$`.
Paths with empty segments (`author..name`), leading dots (`.author`), or trailing dots (`author.`) are rejected immediately with `QueryParseError`.

---

## 5. Sort Syntax Normalization

Supported sort inputs:
- Prefix notation: `-created_at` (DESC), `+created_at` (ASC), `created_at` (ASC)
- SQL keyword notation: `created_at DESC`, `created_at ASC`, `created_at desc`, `created_at asc`
- Multi-field comma separation: `title ASC, -created_at`, `priority DESC, id ASC`

All sort inputs normalize to:
```ts
interface SortCriteria {
  field: string
  direction: 'ASC' | 'DESC'
}
```
