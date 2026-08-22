/**
 * Solarch Platform Deployment Log Redactor (Phase 7)
 *
 * Scrubs credentials, connection strings, auth headers, and API keys from terminal and logs.
 */

export class LogRedactor {
  private static readonly REDACTION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
    // Database connection strings: postgresql://user:pass@host -> postgresql://user:***@host
    {
      pattern: /([a-zA-Z0-9+]+:\/\/[^:]+:)([^@\s'"]+)(@[^'"]+)/g,
      replacement: '$1***$3',
    },
    // Bearer tokens
    {
      pattern: /(Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi,
      replacement: '$1[REDACTED_TOKEN]',
    },
    // Generic API keys and secrets in key=value or key: value
    {
      pattern: /(API_KEY|SECRET_KEY|AUTH_TOKEN|JWT_SECRET|PASSWORD)\s*([:=])\s*['"]?[a-zA-Z0-9_\-\.]{12,}['"]?/gi,
      replacement: '$1$2"[REDACTED]"',
    },
    // Private Key lines
    {
      pattern: /-----BEGIN [A-Z0-9_-]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9_-]+ PRIVATE KEY-----/g,
      replacement: '[REDACTED_PRIVATE_KEY_BLOCK]',
    },
  ]

  /**
   * Redacts sensitive secrets from a string.
   */
  public static redact(text: string): string {
    if (!text) return text
    let output = text
    for (const rule of LogRedactor.REDACTION_RULES) {
      output = output.replace(rule.pattern, rule.replacement)
    }
    return output
  }
}
