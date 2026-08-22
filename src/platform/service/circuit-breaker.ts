/**
 * Solarch Service Rollback Circuit Breaker (Phase 9)
 *
 * Prevents recursive rollback loops by tracking rollback velocity and tripping
 * the circuit breaker when failure thresholds are exceeded.
 */

import { CircuitBreakerState, RecoveryPolicy, ServiceState } from './types.js'

export class ServiceCircuitBreaker {
  private state: CircuitBreakerState
  private policy: RecoveryPolicy

  constructor(policy?: Partial<RecoveryPolicy>) {
    this.policy = {
      mode: policy?.mode || 'observe',
      maxRollbackAttempts: policy?.maxRollbackAttempts ?? 2,
      cooldownSeconds: policy?.cooldownSeconds ?? 300,
      circuitBreakerEnabled: policy?.circuitBreakerEnabled ?? true,
    }

    this.state = {
      tripped: false,
      recentRollbackAttempts: 0,
    }
  }

  public getPolicy(): RecoveryPolicy {
    return { ...this.policy }
  }

  public getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Evaluates whether an automated rollback is permitted or if the circuit breaker should trip.
   */
  public recordRollbackAttempt(reason: string): { allowed: boolean; nextState: ServiceState; reason?: string } {
    if (!this.policy.circuitBreakerEnabled) {
      return { allowed: true, nextState: 'RECOVERING' }
    }

    const now = Date.now()
    if (this.state.lastRollbackAt) {
      const lastRollbackTime = new Date(this.state.lastRollbackAt).getTime()
      const elapsedSeconds = (now - lastRollbackTime) / 1000

      // Reset count if cooldown has elapsed
      if (elapsedSeconds > this.policy.cooldownSeconds) {
        this.state.recentRollbackAttempts = 0
        this.state.tripped = false
        this.state.trippedReason = undefined
      }
    }

    this.state.recentRollbackAttempts += 1
    this.state.lastRollbackAt = new Date(now).toISOString()

    // Check if rollback limit exceeded
    if (this.state.recentRollbackAttempts > this.policy.maxRollbackAttempts) {
      this.state.tripped = true
      this.state.trippedReason = `Rollback loop detected: ${this.state.recentRollbackAttempts} attempts in ${this.policy.cooldownSeconds}s window (limit: ${this.policy.maxRollbackAttempts})`
      this.state.trippedAt = this.state.lastRollbackAt

      return {
        allowed: false,
        nextState: 'FAILED',
        reason: this.state.trippedReason,
      }
    }

    return {
      allowed: true,
      nextState: 'RECOVERING',
    }
  }

  /**
   * Resets the circuit breaker state (manual human intervention).
   */
  public reset(): void {
    this.state = {
      tripped: false,
      recentRollbackAttempts: 0,
    }
  }
}
