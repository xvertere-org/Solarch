/**
 * Solarch Telemetry-Driven Recovery Gate (Phase 9)
 *
 * Evaluates live telemetry metrics to detect production regressions and dispatch
 * recovery actions according to the active RecoveryMode and CircuitBreaker policy.
 */

import { CanaryEvaluationRule, RecoveryMode, ServiceState } from './types.js'
import { MetricsSnapshot } from '../telemetry/types.js'
import { ServiceCircuitBreaker } from './circuit-breaker.js'

export interface HealthEvaluationResult {
  healthy: boolean
  state: ServiceState
  mode: RecoveryMode
  anomalies: string[]
  recommendedAction: 'none' | 'observe' | 'notify' | 'rollback'
  autoRollbackExecuted: boolean
  circuitBreakerTripped: boolean
  reason?: string
}

export class TelemetryRecoveryGate {
  private rule: CanaryEvaluationRule
  private circuitBreaker: ServiceCircuitBreaker

  constructor(circuitBreaker: ServiceCircuitBreaker, rule?: Partial<CanaryEvaluationRule>) {
    this.circuitBreaker = circuitBreaker
    this.rule = {
      max5xxErrorRatePercent: rule?.max5xxErrorRatePercent ?? 1.0,
      max4xxErrorRatePercent: rule?.max4xxErrorRatePercent ?? 15.0,
      maxLatencyP99Ms: rule?.maxLatencyP99Ms ?? 500,
      maxConsecutiveProbeFailures: rule?.maxConsecutiveProbeFailures ?? 3,
    }
  }

  /**
   * Evaluates telemetry snapshot and determines recovery response.
   */
  public evaluate(
    snapshot: MetricsSnapshot,
    baselineP99Ms: number = 200,
    failedProbes: number = 0
  ): HealthEvaluationResult {
    const anomalies: string[] = []
    const mode = this.circuitBreaker.getPolicy().mode

    if (snapshot.errorRate5xx > this.rule.max5xxErrorRatePercent) {
      anomalies.push(
        `5xx error rate (${snapshot.errorRate5xx}%) exceeds threshold of ${this.rule.max5xxErrorRatePercent}%`
      )
    }

    if (snapshot.errorRate4xx > this.rule.max4xxErrorRatePercent) {
      anomalies.push(
        `4xx error rate (${snapshot.errorRate4xx}%) exceeds threshold of ${this.rule.max4xxErrorRatePercent}%`
      )
    }

    const latencyLimit = Math.max(baselineP99Ms * 2.5, this.rule.maxLatencyP99Ms)
    if (snapshot.latencyP99Ms > latencyLimit) {
      anomalies.push(
        `p99 latency (${snapshot.latencyP99Ms}ms) exceeds regression threshold of ${latencyLimit}ms (2.5x baseline)`
      )
    }

    if (failedProbes >= this.rule.maxConsecutiveProbeFailures) {
      anomalies.push(
        `Consecutive failed health probes (${failedProbes}) reached threshold of ${this.rule.maxConsecutiveProbeFailures}`
      )
    }

    if (anomalies.length === 0) {
      return {
        healthy: true,
        state: 'HEALTHY',
        mode,
        anomalies: [],
        recommendedAction: 'none',
        autoRollbackExecuted: false,
        circuitBreakerTripped: false,
      }
    }

    const reason = anomalies.join('; ')

    // Mode-specific handling
    if (mode === 'observe') {
      return {
        healthy: false,
        state: 'DEGRADED',
        mode,
        anomalies,
        recommendedAction: 'observe',
        autoRollbackExecuted: false,
        circuitBreakerTripped: false,
        reason,
      }
    }

    if (mode === 'notify') {
      return {
        healthy: false,
        state: 'DEGRADED',
        mode,
        anomalies,
        recommendedAction: 'notify',
        autoRollbackExecuted: false,
        circuitBreakerTripped: false,
        reason,
      }
    }

    // Auto recovery mode: check circuit breaker
    const breakerCheck = this.circuitBreaker.recordRollbackAttempt(reason)

    if (!breakerCheck.allowed) {
      return {
        healthy: false,
        state: breakerCheck.nextState,
        mode,
        anomalies,
        recommendedAction: 'none',
        autoRollbackExecuted: false,
        circuitBreakerTripped: true,
        reason: breakerCheck.reason,
      }
    }

    return {
      healthy: false,
      state: 'RECOVERING',
      mode,
      anomalies,
      recommendedAction: 'rollback',
      autoRollbackExecuted: true,
      circuitBreakerTripped: false,
      reason,
    }
  }
}
