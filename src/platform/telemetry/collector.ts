/**
 * Solarch Runtime Metrics Collector (Phase 8)
 *
 * Collects runtime metric samples in a bounded buffer. Guaranteed fail-open:
 * errors during collection never bubble up to crash or block the application.
 */

import { MetricSample, MetricsSnapshot } from './types.js'
import { MetricsAggregator } from './aggregator.js'

export interface CollectorConfig {
  maxBufferSize?: number
  defaultWindowMs?: number
}

export class MetricsCollector {
  private projectId: string
  private environment: string
  private samples: MetricSample[] = []
  private maxBufferSize: number
  private defaultWindowMs: number

  constructor(projectId: string, environment: string, config: CollectorConfig = {}) {
    this.projectId = projectId
    this.environment = environment
    this.maxBufferSize = config.maxBufferSize || 10000
    this.defaultWindowMs = config.defaultWindowMs || 60000
  }

  /**
   * Records an HTTP request execution sample (fail-open).
   */
  public recordRequest(durationMs: number, statusCode: number): void {
    try {
      if (this.samples.length >= this.maxBufferSize) {
        // Drop oldest sample if buffer is full
        this.samples.shift()
      }
      this.samples.push({
        timestamp: Date.now(),
        durationMs,
        statusCode,
        isError: statusCode >= 400,
        isDb: false,
      })
    } catch {
      // Fail-open: ignore any internal buffer error
    }
  }

  /**
   * Records a database query execution sample (fail-open).
   */
  public recordDbQuery(durationMs: number, isError: boolean = false): void {
    try {
      if (this.samples.length >= this.maxBufferSize) {
        this.samples.shift()
      }
      this.samples.push({
        timestamp: Date.now(),
        durationMs,
        isError,
        isDb: true,
      })
    } catch {
      // Fail-open
    }
  }

  /**
   * Generates a snapshot of the current metrics window.
   */
  public getSnapshot(windowMs: number = this.defaultWindowMs): MetricsSnapshot {
    try {
      const cutoff = Date.now() - windowMs
      const windowSamples = this.samples.filter((s) => s.timestamp >= cutoff)
      return MetricsAggregator.aggregate(
        this.projectId,
        this.environment,
        windowSamples,
        windowMs
      )
    } catch {
      // Fallback empty snapshot on error
      return {
        projectId: this.projectId,
        environment: this.environment,
        timestamp: new Date().toISOString(),
        windowMs,
        rps: 0,
        totalRequests: 0,
        latencyP50Ms: 0,
        latencyP95Ms: 0,
        latencyP99Ms: 0,
        errorRate4xx: 0,
        errorRate5xx: 0,
        dbAverageLatencyMs: 0,
        dbActiveConnections: 1,
        memoryUsageMb: 0,
        cpuUsagePercent: 0,
      }
    }
  }

  /**
   * Clears accumulated samples.
   */
  public clear(): void {
    this.samples = []
  }
}
