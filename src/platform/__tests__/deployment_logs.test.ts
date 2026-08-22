import { describe, it, expect } from 'vitest'
import { LogRedactor } from '../deployment/log-redactor.js'

describe('Deployment Log Secret Redaction (Phase 7)', () => {
  it('1. Redacts database credentials from connection strings in log lines', () => {
    const raw = 'Connecting to postgresql://postgres:superSecretPass123@aws-0-us-east-1.pooler.supabase.com:6543/postgres...'
    const redacted = LogRedactor.redact(raw)

    expect(redacted).not.toContain('superSecretPass123')
    expect(redacted).toContain('postgresql://postgres:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres')
  })

  it('2. Redacts bearer authentication tokens in logs', () => {
    const raw = 'HTTP Request with header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDDF'
    const redacted = LogRedactor.redact(raw)

    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    expect(redacted).toContain('Bearer [REDACTED_TOKEN]')
  })

  it('3. Redacts generic API keys and private key blocks', () => {
    const raw1 = 'Setting env: PAYMENT_API_KEY="test_key_XXXXXXXXXXXXXXXXXXXXXXXXXX"'
    const redacted1 = LogRedactor.redact(raw1)
    expect(redacted1).not.toContain('test_key_XXXXXXXXXXXXXXXXXXXXXXXXXX')

    const raw2 = 'Loaded key: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----'
    const redacted2 = LogRedactor.redact(raw2)
    expect(redacted2).not.toContain('MIIEowIBAAKCAQEA0')
    expect(redacted2).toContain('[REDACTED_PRIVATE_KEY_BLOCK]')
  })
})
