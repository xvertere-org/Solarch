import { describe, it, expect } from 'vitest'
import { ServiceCircuitBreaker } from '../service/circuit-breaker.js'

describe('Service Rollback Circuit Breaker (Phase 9)', () => {
  it('1. Permits rollback attempts within safety limit', () => {
    const breaker = new ServiceCircuitBreaker({ maxRollbackAttempts: 2, cooldownSeconds: 300 })

    const attempt1 = breaker.recordRollbackAttempt('Error spike')
    expect(attempt1.allowed).toBe(true)
    expect(attempt1.nextState).toBe('RECOVERING')

    const attempt2 = breaker.recordRollbackAttempt('Error spike again')
    expect(attempt2.allowed).toBe(true)
    expect(attempt2.nextState).toBe('RECOVERING')
  })

  it('2. Trips circuit breaker and enters FAILED state when rollback loop detected', () => {
    const breaker = new ServiceCircuitBreaker({ maxRollbackAttempts: 2, cooldownSeconds: 300 })

    breaker.recordRollbackAttempt('Attempt 1')
    breaker.recordRollbackAttempt('Attempt 2')

    // 3rd attempt breaches maxRollbackAttempts of 2
    const attempt3 = breaker.recordRollbackAttempt('Attempt 3')
    expect(attempt3.allowed).toBe(false)
    expect(attempt3.nextState).toBe('FAILED')
    expect(attempt3.reason).toContain('Rollback loop detected')
    expect(breaker.getState().tripped).toBe(true)

    // Manual reset restores breaker
    breaker.reset()
    expect(breaker.getState().tripped).toBe(false)
    expect(breaker.getState().recentRollbackAttempts).toBe(0)
  })
})
