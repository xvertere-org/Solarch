import { describe, it, expect } from 'vitest'
import { TelemetryRecoveryGate } from '../service/recovery-gate.js'
import { ServiceCircuitBreaker } from '../service/circuit-breaker.js'
import { MetricsSnapshot } from '../telemetry/types.js'

describe('Telemetry Recovery Gate & Recovery Modes (Phase 9)', () => {
  const createMockSnapshot = (overrides?: Partial<MetricsSnapshot>): MetricsSnapshot => ({
    projectId: 'prj-1',
    environment: 'production',
    timestamp: new Date().toISOString(),
    windowMs: 60000,
    totalRequests: 100,
    rps: 10,
    latencyP50Ms: 20,
    latencyP95Ms: 50,
    latencyP99Ms: 100,
    errorRate4xx: 0,
    errorRate5xx: 0,
    dbAverageLatencyMs: 5,
    dbActiveConnections: 2,
    memoryUsageMb: 256,
    cpuUsagePercent: 15,
    ...overrides,
  })

  it('1. Observe mode: detects 5xx error spike without triggering automated rollback', () => {
    const breaker = new ServiceCircuitBreaker({ mode: 'observe' })
    const gate = new TelemetryRecoveryGate(breaker)

    const degradedSnapshot = createMockSnapshot({ errorRate5xx: 2.5 })
    const result = gate.evaluate(degradedSnapshot)

    expect(result.healthy).toBe(false)
    expect(result.state).toBe('DEGRADED')
    expect(result.recommendedAction).toBe('observe')
    expect(result.autoRollbackExecuted).toBe(false)
    expect(result.anomalies[0]).toContain('5xx error rate')
  })

  it('2. Auto mode: automatically executes rollback on latency regression', () => {
    const breaker = new ServiceCircuitBreaker({ mode: 'auto', maxRollbackAttempts: 2 })
    const gate = new TelemetryRecoveryGate(breaker)

    // Baseline is 100ms, regression threshold is 2.5x = 250ms (or rule max 500ms). Setting 600ms triggers regression
    const slowSnapshot = createMockSnapshot({ latencyP99Ms: 600 })
    const result = gate.evaluate(slowSnapshot, 100)

    expect(result.healthy).toBe(false)
    expect(result.state).toBe('RECOVERING')
    expect(result.recommendedAction).toBe('rollback')
    expect(result.autoRollbackExecuted).toBe(true)
  })
})
