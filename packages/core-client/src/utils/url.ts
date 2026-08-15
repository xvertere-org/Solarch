/**
 * @solarch/core-client - URL Normalization Utilities
 */

export function normalizeBaseUrl(baseUrl: string = '/'): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return '/'
  return trimmed.replace(/\/+$/, '')
}

export function joinUrlPath(baseUrl: string, path: string): string {
  const cleanBase = normalizeBaseUrl(baseUrl)
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (cleanBase === '/' || cleanBase === '') {
    return cleanPath
  }

  return `${cleanBase}${cleanPath}`
}
