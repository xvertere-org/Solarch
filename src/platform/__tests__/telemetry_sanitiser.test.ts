import { describe, it, expect } from 'vitest'
import { TelemetrySanitiser } from '../telemetry/sanitiser.js'

describe('Pre-Persistence Telemetry Sanitiser (Phase 8)', () => {
  it('1. Redacts sensitive header keys and values without mutating input object', () => {
    const original = {
      headers: {
        authorization: 'Bearer secret_token_1234567890123456',
        cookie: 'session_id=abcdef1234567890',
        'content-type': 'application/json',
      },
      url: 'https://api.solarch.cloud/v1/projects?token=supersecret123&password=myPassword123',
    }

    const sanitized = TelemetrySanitiser.sanitize(original)

    // Verify original object is NOT mutated
    expect(original.headers.authorization).toBe('Bearer secret_token_1234567890123456')
    expect(original.headers.cookie).toBe('session_id=abcdef1234567890')
    expect(original.url).toContain('supersecret123')

    // Verify sanitized object has redacted values
    expect(sanitized.headers.authorization).toBe('[REDACTED]')
    expect(sanitized.headers.cookie).toBe('[REDACTED]')
    expect(sanitized.headers['content-type']).toBe('application/json')
    expect(sanitized.url).toBe('https://api.solarch.cloud/v1/projects?token=[REDACTED]&password=[REDACTED]')
  })

  it('2. Redacts deeply nested secrets in objects and arrays', () => {
    const payload = {
      user: {
        id: 'u-1',
        profile: {
          apiKey: 'key_live_abcdef1234567890',
          passwordHash: '$argon2id$v=19$m=65536...',
        },
      },
      connections: [
        {
          name: 'primary',
          uri: 'postgres://admin:superSecretPass@db.remote.com:5432/app',
        },
      ],
    }

    const sanitized = TelemetrySanitiser.sanitize(payload)

    expect(sanitized.user.profile.apiKey).toBe('[REDACTED]')
    expect(sanitized.user.profile.passwordHash).toBe('[REDACTED]')
    expect(sanitized.connections[0].uri).toBe('postgres://admin:***@db.remote.com:5432/app')
  })

  it('3. Redacts private key blocks in text attributes', () => {
    const raw = 'Config with key: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----'
    const sanitized = TelemetrySanitiser.sanitizeString(raw)

    expect(sanitized).toBe('Config with key: [REDACTED_PRIVATE_KEY_BLOCK]')
  })
})
