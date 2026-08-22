/**
 * Solarch Metrics Aggregator (Phase 8)
 *
 * Implements mathematically accurate percentile calculations (nearest-rank/linear interpolation)
 * and error rate computations across collected runtime samples.
 */

import { MetricSample, MetricsSnapshot } from './types.js'

export class MetricsAggregator {
  /**
   * Computes a specific percentile (0-100) from a sorted array of numbers.
   */
  public static calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    if (sortedValues.length === 1) return sortedValues[0]

    const rank = (percentile / 100) * (sortedValues.length - 1)
    const lowerIndex = Math.floor(rank)
    const upperIndex = Math.ceil(rank)
    const weight = rank - lowerIndex

    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex]
    }

    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  }

  /**
   * Aggregates an array of MetricSample objects into an immutable MetricsSnapshot.
   */
  public static aggregate(
    projectId: string,
    environment: string,
    samples: MetricSample[],
    windowMs: number = 60000,
    systemStats: { dbActiveConnections?: number; memoryUsageMb?: number; cpuUsagePercent?: number } = {}
  ): MetricsSnapshot {
    const totalRequests = samples.filter((s) => !s.isDb).length
    const httpSamples = samples.filter((s) => !s.isDb)
    const dbSamples = samples.filter((s) => s.isDb)

    const httpLatencies = httpSamples.map((s) => s.durationMs).sort((a, b) => a - b)
    const dbLatencies = dbSamples.map((s) => s.durationMs)

    const p50 = MetricsAggregator.calculatePercentile(httpLatencies, 50)
    const p95 = MetricsAggregator.calculatePercentile(httpLatencies, 95)
    const p99 = MetricsAggregator.calculatePercentile(httpLatencies, 99)

    const count4xx = httpSamples.filter((s) => s.statusCode && s.statusCode >= 400 && s.statusCode < 500).length
    const count5xx = httpSamples.filter((s) => s.statusCode && s.statusCode >= 500).length

    const errorRate4xx = totalRequests > 0 ? (count4xx / totalRequests) * 100 : 0
    const errorRate5xx = totalRequests > 0 ? (count5xx / totalRequests) * 100 : 0

    const rps = windowMs > 0 ? Number(((totalRequests / (windowMs / 1000))).toFixed(2)) : 0

    const dbAverageLatencyMs =
      dbLatencies.length > 0
        ? Number((dbLatencies.reduce((a, b) => a + b, 0) / dbLatencies.length).toFixed(2))
        : 0

    return {
      projectId,
      environment,
      timestamp: new Date().toISOString(),
      windowMs,
      rps,
      totalRequests,
      latencyP50Ms: Number(p50.toFixed(2)),
      latencyP95Ms: Number(p95.toFixed(2)),
      latencyP99Ms: Number(p99.toFixed(2)),
      errorRate4xx: Number(errorRate4xx.toFixed(2)),
      errorRate5xx: Number(errorRate5xx.toFixed(2)),
      dbAverageLatencyMs,
      dbActiveConnections: systemStats.dbActiveConnections || 1,
      memoryUsageMb: systemStats.memoryUsageMb || Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuUsagePercent: systemStats.cpuUsagePercent || 0,
    }
  }
}
