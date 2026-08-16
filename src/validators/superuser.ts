export function normalizeAdminUsername(username: string): string {
  if (!username) return ''
  return username.trim().toLowerCase()
}

export function validateAdminUsername(username: string): Error | null {
  const normalized = normalizeAdminUsername(username)
  if (normalized.length < 3) return new Error('Username must be at least 3 characters')
  if (normalized.length > 50) return new Error('Username must be at most 50 characters')
  if (!/^[a-z0-9_]+$/.test(normalized)) return new Error('Username can only contain alphanumeric characters and underscores')
  return null
}
