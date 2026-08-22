/**
 * Solarch Service Lifecycle Orchestrator (Phase 9)
 *
 * Implements the 10-state production service machine with scale guards,
 * staged canary progression, maintenance mode, and audit logging.
 */

import {
  MaintenanceConfig,
  RecoveryPolicy,
  ScalingPolicy,
  ServiceAuditEvent,
  ServiceHealthDashboard,
  ServiceState,
  ServiceTopologySpec,
  TrafficAllocation,
  TrafficPolicy,
} from './types.js'
import { ScalingGuard } from './scaling-guard.js'
import { TrafficManager } from './traffic-manager.js'
import { ServiceCircuitBreaker } from './circuit-breaker.js'
import { TelemetryRecoveryGate, HealthEvaluationResult } from './recovery-gate.js'
import { MetricsSnapshot } from '../telemetry/types.js'

export class ServiceLifecycleManager {
  private projectId: string
  private environment: string
  private state: ServiceState
  private topology: ServiceTopologySpec
  private maintenance: MaintenanceConfig
  private activeDeployment: {
    id: string
    version: string
    bundleHash: string
    trafficPercent: number
  }
  private canaryDeployment?: {
    id: string
    version: string
    trafficPercent: number
  }
  private auditEvents: ServiceAuditEvent[] = []
  private scalingGuard: ScalingGuard
  private trafficManager: TrafficManager
  private circuitBreaker: ServiceCircuitBreaker
  private recoveryGate: TelemetryRecoveryGate

  constructor(
    projectId: string,
    environment: string,
    initial?: {
      state?: ServiceState
      topology?: Partial<ServiceTopologySpec>
      activeDeployment?: { id: string; version: string; bundleHash: string }
      scalingPolicy?: Partial<ScalingPolicy>
      trafficPolicy?: Partial<TrafficPolicy>
      recoveryPolicy?: Partial<RecoveryPolicy>
    }
  ) {
    this.projectId = projectId
    this.environment = environment
    this.state = initial?.state ?? 'HEALTHY'
    this.topology = {
      instances: initial?.topology?.instances ?? 2,
      memoryMb: initial?.topology?.memoryMb ?? 512,
      cpuMilli: initial?.topology?.cpuMilli ?? 500,
      minInstances: initial?.topology?.minInstances ?? 1,
      maxInstances: initial?.topology?.maxInstances ?? 10,
    }
    this.maintenance = {
      enabled: false,
      message: 'Service is currently undergoing maintenance. Please try again shortly.',
      statusCode: 503,
    }
    this.activeDeployment = {
      id: initial?.activeDeployment?.id ?? 'dep_initial',
      version: initial?.activeDeployment?.version ?? '0.1.0',
      bundleHash: initial?.activeDeployment?.bundleHash ?? 'hash_init',
      trafficPercent: 100,
    }

    this.scalingGuard = new ScalingGuard(initial?.scalingPolicy)
    this.trafficManager = new TrafficManager(initial?.trafficPolicy)
    this.circuitBreaker = new ServiceCircuitBreaker(initial?.recoveryPolicy)
    this.recoveryGate = new TelemetryRecoveryGate(this.circuitBreaker)
  }

  public getState(): ServiceState {
    return this.state
  }

  public getTopology(): ServiceTopologySpec {
    return { ...this.topology }
  }

  public getAuditEvents(): ServiceAuditEvent[] {
    return [...this.auditEvents]
  }

  /**
   * Scales compute instances or resource allocations.
   */
  public scale(
    requested: Partial<ServiceTopologySpec>,
    actor: string = 'cli_user',
    force: boolean = false
  ): { success: boolean; topology?: ServiceTopologySpec; warning?: string; error?: string } {
    const validation = this.scalingGuard.validate(this.topology, requested, force)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const prevState = this.state
    this.state = 'SCALING'

    this.topology = {
      instances: requested.instances ?? this.topology.instances,
      memoryMb: requested.memoryMb ?? this.topology.memoryMb,
      cpuMilli: requested.cpuMilli ?? this.topology.cpuMilli,
      minInstances: requested.minInstances ?? this.topology.minInstances,
      maxInstances: requested.maxInstances ?? this.topology.maxInstances,
    }

    this.state = 'HEALTHY'
    this.recordAudit(actor, 'service.scale', prevState, this.state, 'Resource scaling applied', {
      topology: this.topology,
    })

    return { success: true, topology: this.topology, warning: validation.warning }
  }

  /**
   * Toggles service maintenance mode.
   */
  public setMaintenance(
    enabled: boolean,
    message?: string,
    actor: string = 'cli_user'
  ): MaintenanceConfig {
    const prevState = this.state
    this.maintenance = {
      enabled,
      message: message || this.maintenance.message,
      statusCode: 503,
      enabledAt: enabled ? new Date().toISOString() : undefined,
    }

    if (enabled) {
      this.state = 'MAINTENANCE'
      this.recordAudit(actor, 'service.maintenance.enabled', prevState, this.state, this.maintenance.message)
    } else {
      this.state = 'HEALTHY'
      this.recordAudit(actor, 'service.maintenance.disabled', prevState, this.state, 'Maintenance mode lifted')
    }

    return { ...this.maintenance }
  }

  /**
   * Allocates staged traffic between active and canary deployments.
   */
  public setTraffic(
    canaryDeploymentId: string,
    canaryWeight: number,
    canaryStatus: string = 'healthy',
    actor: string = 'cli_user',
    force: boolean = false
  ): { success: boolean; allocations?: TrafficAllocation[]; error?: string; warning?: string } {
    const currentCanaryWeight = this.canaryDeployment?.trafficPercent ?? 0
    const result = this.trafficManager.allocate(
      this.activeDeployment.id,
      canaryDeploymentId,
      canaryWeight,
      canaryStatus,
      currentCanaryWeight,
      force
    )

    if (!result.valid || !result.allocations) {
      return { success: false, error: result.error }
    }

    const prevState = this.state
    if (canaryWeight === 100) {
      // Full promotion
      this.activeDeployment = {
        id: canaryDeploymentId,
        version: 'promoted',
        bundleHash: 'hash_promoted',
        trafficPercent: 100,
      }
      this.canaryDeployment = undefined
    } else if (canaryWeight === 0) {
      this.activeDeployment.trafficPercent = 100
      this.canaryDeployment = undefined
    } else {
      this.activeDeployment.trafficPercent = 100 - canaryWeight
      this.canaryDeployment = {
        id: canaryDeploymentId,
        version: 'canary',
        trafficPercent: canaryWeight,
      }
    }

    this.recordAudit(actor, 'service.traffic.changed', prevState, this.state, `Traffic split: canary ${canaryWeight}%`, {
      canaryDeploymentId,
      canaryWeight,
    })

    return { success: true, allocations: result.allocations, warning: result.warning }
  }

  /**
   * Evaluates live telemetry metrics and runs recovery if appropriate.
   */
  public evaluateHealth(
    metrics: MetricsSnapshot,
    baselineP99Ms: number = 200,
    failedProbes: number = 0,
    actor: string = 'system_evaluator'
  ): HealthEvaluationResult {
    const prevState = this.state
    const evaluation = this.recoveryGate.evaluate(metrics, baselineP99Ms, failedProbes)

    if (!evaluation.healthy) {
      this.state = evaluation.state

      if (evaluation.autoRollbackExecuted) {
        // Rollback: revert canary traffic
        this.activeDeployment.trafficPercent = 100
        this.canaryDeployment = undefined

        this.recordAudit(
          actor,
          'service.rollback.triggered',
          prevState,
          this.state,
          evaluation.reason || 'Telemetry degradation threshold breached'
        )
      } else if (evaluation.circuitBreakerTripped) {
        this.recordAudit(
          actor,
          'service.circuit_breaker.tripped',
          prevState,
          this.state,
          evaluation.reason || 'Rollback circuit breaker tripped'
        )
      }
    } else {
      if (this.state === 'DEGRADED' || this.state === 'RECOVERING') {
        this.state = 'HEALTHY'
      }
    }

    return evaluation
  }

  /**
   * Resets the circuit breaker and restores healthy state.
   */
  public resetCircuitBreaker(actor: string = 'cli_user'): void {
    const prevState = this.state
    this.circuitBreaker.reset()
    if (this.state === 'FAILED' || this.state === 'DEGRADED') {
      this.state = 'HEALTHY'
    }
    this.recordAudit(actor, 'service.circuit_breaker.reset', prevState, this.state, 'Circuit breaker manually reset')
  }

  /**
   * Generates a complete unified production health dashboard report.
   */
  public getDashboard(
    databaseStatus: 'Healthy' | 'Degraded' | 'Unreachable' = 'Healthy',
    plugins: Array<{ name: string; version: string; status: 'Active' | 'Degraded' | 'Disabled' }> = [],
    telemetry?: MetricsSnapshot
  ): ServiceHealthDashboard {
    const defaultTelemetry: MetricsSnapshot = {
      projectId: this.projectId,
      environment: this.environment,
      timestamp: new Date().toISOString(),
      windowMs: 60000,
      totalRequests: 0,
      rps: 0,
      latencyP50Ms: 0,
      latencyP95Ms: 0,
      latencyP99Ms: 0,
      errorRate4xx: 0,
      errorRate5xx: 0,
      dbAverageLatencyMs: 0,
      dbActiveConnections: 0,
      memoryUsageMb: this.topology.memoryMb,
      cpuUsagePercent: 0,
    }

    return {
      projectId: this.projectId,
      environment: this.environment,
      state: this.state,
      topology: { ...this.topology },
      activeDeployment: { ...this.activeDeployment },
      canaryDeployment: this.canaryDeployment ? { ...this.canaryDeployment } : undefined,
      maintenance: { ...this.maintenance },
      database: {
        engine: 'postgres',
        provider: 'Neon',
        topology: 'postgres-serverless',
        status: databaseStatus,
      },
      plugins: [...plugins],
      telemetry: telemetry || defaultTelemetry,
      recovery: {
        mode: this.circuitBreaker.getPolicy().mode,
        circuitBreaker: this.circuitBreaker.getState(),
      },
    }
  }

  private recordAudit(
    actor: string,
    action: ServiceAuditEvent['action'],
    previousState: ServiceState,
    newState: ServiceState,
    reason?: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: ServiceAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: this.projectId,
      environment: this.environment,
      actor,
      action,
      previousState,
      newState,
      timestamp: new Date().toISOString(),
      reason,
      metadata,
    }
    this.auditEvents.push(event)
  }
}
