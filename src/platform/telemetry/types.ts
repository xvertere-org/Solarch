/**
 * Solarch Platform Telemetry & Observability Types (Phase 8)
 */

export type TelemetryEnvironment = 'development' | 'staging' | 'production' | string

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  id: string
  projectId: string
  environment: string
  timestamp: string
  level: LogLevel
  message: string
  component?: string
  attributes?: Record<string, any>
  traceId?: string
  spanId?: string
}

export interface MetricSample {
  timestamp: number
  durationMs: number
  statusCode?: number
  isError?: boolean
  isDb?: boolean
}

export interface MetricsSnapshot {
  projectId: string
  environment: string
  timestamp: string
  windowMs: number
  rps: number
  totalRequests: number
  latencyP50Ms: number
  latencyP95Ms: number
  latencyP99Ms: number
  errorRate4xx: number
  errorRate5xx: number
  dbAverageLatencyMs: number
  dbActiveConnections: number
  memoryUsageMb: number
  cpuUsagePercent: number
}

export interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  traceparent: string
  projectId: string
  environment: string
  name: string
  kind: 'server' | 'client' | 'producer' | 'consumer' | 'internal'
  startTime: number
  endTime: number
  durationMs: number
  statusCode?: 'ok' | 'error'
  attributes: Record<string, any>
}

export interface AuditEvent {
  id: string
  projectId: string
  environment: string
  actor: {
    id: string
    email?: string
    type: 'user' | 'admin' | 'api_key' | 'system'
  }
  action: string
  resource: string
  result: 'success' | 'denied' | 'failed'
  timestamp: string
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  projectId: string
  environment: string
  name: string
  metric: string
  threshold: number
  comparison: 'gt' | 'lt' | 'eq'
  severity: 'info' | 'warning' | 'critical'
  status: 'firing' | 'resolved'
  triggeredAt?: string
  resolvedAt?: string
  affectedService?: string
  message: string
}
