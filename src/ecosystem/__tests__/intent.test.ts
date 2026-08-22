import { describe, it, expect } from 'vitest'
import { ProjectIntent } from '../intent'

describe('ProjectIntent Contract (Phase 0)', () => {
  it('creates default intent with standard fallbacks', () => {
    const intent = new ProjectIntent()
    expect(intent.application).toBe('api')
    expect(intent.deployment).toBe('local')
    expect(intent.desktopRuntime).toBe('unspecified')
    expect(intent.features.auth).toEqual(['email'])
    expect(intent.isExplicit('application')).toBe(false)
    expect(intent.isExplicit('database')).toBe(false)
  })

  it('preserves explicit user choices and recognizes them', () => {
    const intent = new ProjectIntent({
      application: 'ai',
      deployment: 'cloud',
      desktopRuntime: 'unspecified',
      explicitChoices: {
        application: 'ai',
        database: 'mongodb',
        sdks: ['solarch-ai', 'solarch-web'],
      },
    })

    expect(intent.application).toBe('ai')
    expect(intent.deployment).toBe('cloud')
    expect(intent.isExplicit('application')).toBe(true)
    expect(intent.isExplicit('database')).toBe(true)
    expect(intent.isExplicit('sdks')).toBe(true)
    expect(intent.isExplicit('deployment')).toBe(false)
    expect(intent.explicitChoices.database).toBe('mongodb')
  })

  it('rejects passwords, secrets, and connection strings during initialization', () => {
    expect(() => {
      new ProjectIntent({
        application: 'api',
        explicitChoices: {
          database: 'postgres',
        },
        // @ts-expect-error - testing credential rejection invariant
        password: 'super-secret-password',
      })
    }).toThrow(/credentials or secrets are strictly forbidden/)

    expect(() => {
      new ProjectIntent({
        // @ts-expect-error - testing connection URL rejection invariant
        databaseUrl: 'postgres://user:pass@localhost:5432/db',
      })
    }).toThrow(/credentials or secrets are strictly forbidden/)
  })
})
