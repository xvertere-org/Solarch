import { describe, it, expect } from 'vitest'
import { ServiceLifecycleManager } from '../service/lifecycle.js'
import { MetricsSnapshot } from '../telemetry/types.js'

describe('E2E Lifecycle 3: Telemetry Degradation, Circuit Breaker & Recovery (Phase 9)', () => {
  const createMockSnapshot = (overrides?: Partial<MetricsSnapshot>): MetricsSnapshot => ({
    projectId: 'prj_recovery_e2e',
    environment: 'production',
    timestamp: new Date().toISOString(),
    windowMs: 60000,
    totalRequests: 500,
    rps: 50,
    latencyP50Ms: 25,
    latencyP95Ms: 60,
    latencyP99Ms: 120,
    errorRate4xx: 0.1,
    errorRate5xx: 0.0,
    dbAverageLatencyMs: 4,
    dbActiveConnections: 5,
    memoryUsageMb: 512,
    cpuUsagePercent: 20,
    ...overrides,
  })

  it('1. Detects telemetry anomaly during canary, executes automated rollback, and protects against rollback loop', () => {
    const manager = new ServiceLifecycleManager('prj_recovery_e2e', 'production', {
      activeDeployment: { id: 'dep_stable_v1', version: '1.0.0', bundleHash: 'hash_v1' },
      recoveryPolicy: { mode: 'auto', maxRollbackAttempts: 2, cooldownSeconds: 300, circuitBreakerEnabled: true },
    })

    // 1. Stage canary deployment (10%)
    manager.setTraffic('dep_buggy_v2', 10, 'healthy', 'ci_deployer')
    expect(manager.getDashboard().canaryDeployment?.trafficPercent).toBe(10)

    // 2. Anomaly: 5xx error rate spikes to 3.5% (threshold is 1.0%)
    const badMetrics = createMockSnapshot({ errorRate5xx: 3.5 })
    const evalResult = manager.evaluateHealth(badMetrics, 120, 0, 'telemetry_daemon')

    expect(evalResult.healthy).toBe(false)
    expect(evalResult.autoRollbackExecuted).toBe(true)
    expect(evalResult.state).toBe('RECOVERING')

    // Verify canary was drained and 100% traffic returned to stable deployment
    const dashboard = manager.getDashboard()
    expect(dashboard.activeDeployment.id).toBe('dep_stable_v1')
    expect(dashboard.activeDeployment.trafficPercent).toBe(100)
    expect(dashboard.canaryDeployment).toBeUndefined()

    // 3. Repeat attempt 2: another rollback
    manager.setTraffic('dep_buggy_v3', 10, 'healthy', 'ci_deployer')
    manager.evaluateHealth(badMetrics, 120, 0, 'telemetry_daemon')

    // 4. Repeat attempt 3: breaches maxRollbackAttempts of 2 -> trips circuit breaker -> FAILED state
    manager.setTraffic('dep_buggy_v4', 10, 'healthy', 'ci_deployer')
    const tripResult = manager.evaluateHealth(badMetrics, 120, 0, 'telemetry_daemon')

    expect(tripResult.circuitBreakerTripped).toBe(true)
    expect(tripResult.state).toBe('FAILED')
    expect(manager.getState()).toBe('FAILED')

    // 5. Manual human intervention resets circuit breaker
    manager.resetCircuitBreaker('ops_lead')
    expect(manager.getState()).toBe('HEALTHY')
  })
})
