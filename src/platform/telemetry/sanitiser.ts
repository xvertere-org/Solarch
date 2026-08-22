/**
 * Solarch Pre-Persistence Telemetry Sanitiser (Phase 8)
 *
 * Guaranteed pure redaction engine operating before any local buffering,
 * storage persistence, remote transmission, or CLI rendering.
 */

export const SENSITIVE_KEY_REGEX =
  /(?:password|secret|token|api_key|apikey|private_key|privatekey|authorization|auth|cookie|credentials|access_key)/i

export const SECRET_STRING_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Database connection URIs: postgres://user:pass@host -> postgres://user:***@host
  {
    pattern: /([a-zA-Z0-9+]+:\/\/[^:]+:)([^@\s'"]+)(@[^'"]+)/g,
    replacement: '$1***$3',
  },
  // Sensitive query parameters in URLs: ?password=...&token=... -> ?password=[REDACTED]&token=[REDACTED]
  {
    pattern: /([?&](?:password|token|api_key|apikey|secret|key|access_token|refresh_token)=)[^&#\s]+/gi,
    replacement: '$1[REDACTED]',
  },
  // Bearer tokens in strings
  {
    pattern: /(Bearer\s+)[a-zA-Z0-9_\-\.]{16,}/gi,
    replacement: '$1[REDACTED_TOKEN]',
  },
  // Private Key Blocks
  {
    pattern: /-----BEGIN [A-Z0-9_-]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9_-]+ PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY_BLOCK]',
  },
]

export class TelemetrySanitiser {
  /**
   * Sanitizes a string value against known secret patterns.
   */
  public static sanitizeString(input: string): string {
    if (!input) return input
    let result = input
    for (const rule of SECRET_STRING_PATTERNS) {
      result = result.replace(rule.pattern, rule.replacement)
    }
    return result
  }

  /**
   * Pure recursive sanitizer for arbitrary telemetry payloads (objects, arrays, primitives).
   * Does NOT mutate the input object.
   */
  public static sanitize<T>(input: T): T {
    if (input === null || input === undefined) {
      return input
    }

    if (typeof input === 'string') {
      return TelemetrySanitiser.sanitizeString(input) as unknown as T
    }

    if (typeof input !== 'object') {
      return input
    }

    if (Array.isArray(input)) {
      return input.map((item) => TelemetrySanitiser.sanitize(item)) as unknown as T
    }

    const sanitizedObj: Record<string, any> = {}
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitizedObj[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = TelemetrySanitiser.sanitize(value)
      } else if (typeof value === 'string') {
        sanitizedObj[key] = TelemetrySanitiser.sanitizeString(value)
      } else {
        sanitizedObj[key] = value
      }
    }

    return sanitizedObj as T
  }
}
