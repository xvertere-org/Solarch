import { describe, it, expect } from 'vitest'
import { TrafficManager } from '../service/traffic-manager.js'

describe('Staged Traffic & Canary Progression (Phase 9)', () => {
  it('1. Rejects allocation to unhealthy canary deployments', () => {
    const tm = new TrafficManager()
    const result = tm.allocate('dep_main', 'dep_canary', 10, 'failed', 0, false)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Candidate must be healthy')
  })

  it('2. Enforces stepped stage progression (e.g. 10% -> 25% -> 50% -> 100%)', () => {
    const tm = new TrafficManager({ allowedStages: [10, 25, 50, 100] })

    // Step 1: 0% -> 10% succeeds
    const step1 = tm.allocate('dep_main', 'dep_canary', 10, 'healthy', 0, false)
    expect(step1.valid).toBe(true)

    // Illegal jump from 10% directly to 50% without force fails
    const badJump = tm.allocate('dep_main', 'dep_canary', 50, 'healthy', 10, false)
    expect(badJump.valid).toBe(false)
    expect(badJump.error).toContain('Skipped stage progression')

    // Next allowed stage (25%) succeeds
    const step2 = tm.allocate('dep_main', 'dep_canary', 25, 'healthy', 10, false)
    expect(step2.valid).toBe(true)

    // Forced jump succeeds
    const forceJump = tm.allocate('dep_main', 'dep_canary', 50, 'healthy', 10, true)
    expect(forceJump.valid).toBe(true)
  })

  it('3. Fully promotes canary on 100% allocation', () => {
    const tm = new TrafficManager()
    const result = tm.allocate('dep_main', 'dep_canary', 100, 'healthy', 50, false)

    expect(result.valid).toBe(true)
    expect(result.allocations?.length).toBe(1)
    expect(result.allocations?.[0].deploymentId).toBe('dep_canary')
    expect(result.allocations?.[0].weight).toBe(100)
    expect(result.allocations?.[0].isCanary).toBe(false)
  })
})
