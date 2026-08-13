export function translatePlaceholders(sql: string): string {
  let out = ''
  let paramIndex = 0
  let inString = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]

    if (inString) {
      out += ch
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += "'"
          i++
        } else {
          inString = false
        }
      }
      continue
    }

    if (ch === "'") {
      inString = true
      out += ch
    } else if (ch === '?') {
      paramIndex++
      out += `$${paramIndex}`
    } else {
      out += ch
    }
  }

  return out
}