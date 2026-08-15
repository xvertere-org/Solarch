/**
 * @solarch/core-client - Deterministic Query Parameter Serializer
 */

export function serializeQueryParams(queryParams?: Record<string, any>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          params.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))
        }
      }
    } else if (typeof value === 'object') {
      params.append(key, JSON.stringify(value))
    } else {
      params.append(key, String(value))
    }
  }

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}
