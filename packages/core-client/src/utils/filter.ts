/**
 * @solarch/core-client - Safe Filter Template Builder
 */

export function serializeFilterValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    // Escape single quotes and backslashes for Solarch filter string literals
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `'${escaped}'`
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeFilterValue).join(', ')}]`
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }
  return String(value)
}

/**
 * Interpolates named parameters into a filter expression safely.
 * Example: filter('author = {:authorId} && status = {:status}', { authorId: 'usr_1', status: 'active' })
 */
export function filter(template: string, params: Record<string, any> = {}): string {
  if (!template) return ''

  return template.replace(/\{:([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return serializeFilterValue(params[key])
    }
    return match
  })
}
