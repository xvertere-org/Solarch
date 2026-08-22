/**
 * Solarch Platform Service & Production Orchestration Types (Phase 9)
 */

import { MetricsSnapshot } from '../telemetry/types.js'

/**
 * Explicit 10-state service lifecycle states
 */
export type ServiceState =
  | 'PROVISIONING'
  | 'INITIALIZING'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'MAINTENANCE'
  | 'DRAINING'
  | 'SCALING'
  | 'RECOVERING'
  | 'FAILED'
  | 'STOPPED'

/**
 * Automated recovery modes
 */
export type RecoveryMode = 'observe' | 'notify' | 'auto'

/**
 * Rollback loop and circuit breaker policy
 */
export interface RecoveryPolicy {
  mode: RecoveryMode
  maxRollbackAttempts: number
  cooldownSeconds: number
  circuitBreakerEnabled: boolean
}

/**
 * Service scaling and cost guard policy
 */
export interface ScalingPolicy {
  maxInstances: number
  maxMemoryMb: number
  maxCpuMilli: number
  enforceLimits: boolean
}

/**
 * Staged canary and traffic progression policy
 */
export interface TrafficPolicy {
  maxCanaryWeight: number
  minimumEvaluationWindowMs: number
  requireHealthyDeployment: boolean
  allowedStages: number[]
}

/**
 * Traffic routing allocation record
 */
export interface TrafficAllocation {
  deploymentId: string
  weight: number
  isCanary: boolean
  allocatedAt: string
}

/**
 * Complete Service Topology & Resources
 */
export interface ServiceTopologySpec {
  instances: number
  memoryMb: number
  cpuMilli: number
  minInstances?: number
  maxInstances?: number
}

/**
 * Service Maintenance Specification
 */
export interface MaintenanceConfig {
  enabled: boolean
  message: string
  statusCode: number
  enabledAt?: string
}

/**
 * Anomaly Evaluation Threshold Rule
 */
export interface CanaryEvaluationRule {
  max5xxErrorRatePercent: number
  max4xxErrorRatePercent: number
  maxLatencyP99Ms: number
  maxConsecutiveProbeFailures: number
}

/**
 * Circuit Breaker State Record
 */
export interface CircuitBreakerState {
  tripped: boolean
  recentRollbackAttempts: number
  lastRollbackAt?: string
  trippedReason?: string
  trippedAt?: string
}

/**
 * Service Audit Mutation Event
 */
export interface ServiceAuditEvent {
  id: string
  projectId: string
  environment: string
  actor: string
  action:
    | 'service.scale'
    | 'service.maintenance.enabled'
    | 'service.maintenance.disabled'
    | 'service.traffic.changed'
    | 'service.rollback.triggered'
    | 'service.circuit_breaker.tripped'
    | 'service.circuit_breaker.reset'
  previousState: ServiceState
  newState: ServiceState
  timestamp: string
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Unified Production Health Dashboard View
 */
export interface ServiceHealthDashboard {
  projectId: string
  environment: string
  state: ServiceState
  topology: ServiceTopologySpec
  activeDeployment: {
    id: string
    version: string
    bundleHash: string
    trafficPercent: number
  }
  canaryDeployment?: {
    id: string
    version: string
    trafficPercent: number
  }
  maintenance: MaintenanceConfig
  database: {
    engine: string
    provider: string
    topology: string
    status: 'Healthy' | 'Degraded' | 'Unreachable'
  }
  plugins: Array<{
    name: string
    version: string
    status: 'Active' | 'Degraded' | 'Disabled'
  }>
  telemetry: MetricsSnapshot
  recovery: {
    mode: RecoveryMode
    circuitBreaker: CircuitBreakerState
    lastRollbackAt?: string
  }
}
