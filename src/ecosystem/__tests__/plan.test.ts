import { describe, it, expect } from 'vitest'
import { ProjectPlan } from '../plan'
import { ProjectIntent } from '../intent'
import { DatabaseStrategy } from '../database'
import { SdkSelection } from '../selection'
import { PluginSelection } from '../plugin'

describe('ProjectPlan Contract (Phase 0)', () => {
  it('creates and validates a complete ProjectPlan', () => {
    const intent = new ProjectIntent({ application: 'web' })
    const db = new DatabaseStrategy({ engine: 'sqlite' })
    const sdks = new SdkSelection({ selected: ['solarch-web'] })
    const plugins = new PluginSelection({ mode: 'none' })

    const plan = new ProjectPlan({
      identity: { name: 'my-web-app', dir: './my-web-app' },
      intent,
      database: db,
      sdks,
      plugins,
    })

    const validation = plan.validate()
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])

    const json = plan.toJSON()
    expect(json.identity.name).toBe('my-web-app')
    expect(json.intent.application).toBe('web')
    expect(json.database.engine).toBe('sqlite')
    expect(json.sdks.selected).toEqual(['solarch-web'])
    expect(json.plugins.mode).toBe('none')
    expect(json.createdAt).toBeDefined()
  })

  it('rejects desktop application if runtime is unspecified upon validation', () => {
    const intent = new ProjectIntent({ application: 'desktop', desktopRuntime: 'unspecified' })
    const db = new DatabaseStrategy({ engine: 'sqlite' })
    const sdks = new SdkSelection({ selected: ['solarch-electron'] })

    const plan = new ProjectPlan({
      identity: { name: 'desktop-app', dir: './desktop-app' },
      intent,
      database: db,
      sdks,
    })

    const validation = plan.validate()
    expect(validation.valid).toBe(false)
    expect(validation.errors[0]).toMatch(/Desktop application requires an explicit desktop runtime/)
  })

  it('strictly rejects any embedded secrets inside ProjectPlan', () => {
    const intent = new ProjectIntent({ application: 'api' })
    const db = new DatabaseStrategy({ engine: 'sqlite' })
    const sdks = new SdkSelection()

    expect(() => {
      new ProjectPlan({
        identity: { name: 'app', dir: './app' },
        intent,
        database: db,
        sdks,
        // @ts-expect-error - testing secret rejection invariant
        jwtSecret: 'top-secret-jwt-key',
      })
    }).toThrow(/secrets or credentials cannot be embedded into ProjectPlan/)
  })
})
