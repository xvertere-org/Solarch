import { describe, it, expect } from 'vitest'
import { MetricsAggregator } from '../telemetry/aggregator.js'
import { MetricsCollector } from '../telemetry/collector.js'

describe('Telemetry Metrics & Percentile Calculation (Phase 8)', () => {
  it('1. Computes mathematical percentiles (p50, p95, p99) accurately over sample distribution', () => {
    // 100 sample latencies from 1ms to 100ms
    const samples = Array.from({ length: 100 }, (_, i) => ({
      timestamp: Date.now(),
      durationMs: i + 1,
      statusCode: 200,
    }))

    const snapshot = MetricsAggregator.aggregate('prj-1', 'production', samples, 60000)

    expect(snapshot.totalRequests).toBe(100)
    expect(snapshot.latencyP50Ms).toBe(50.5) // (100-1)*0.5 = 49.5 -> index 49 (50) & 50 (51) -> 50.5
    expect(snapshot.latencyP95Ms).toBe(95.05) // (100-1)*0.95 = 94.05 -> index 94 (95) & 95 (96) -> 95.05
    expect(snapshot.latencyP99Ms).toBe(99.01) // (100-1)*0.99 = 98.01 -> index 98 (99) & 99 (100) -> 99.01
    expect(snapshot.errorRate4xx).toBe(0)
    expect(snapshot.errorRate5xx).toBe(0)
  })

  it('2. Computes error rate percentages for 4xx and 5xx responses', () => {
    const samples = [
      { timestamp: Date.now(), durationMs: 10, statusCode: 200 },
      { timestamp: Date.now(), durationMs: 12, statusCode: 200 },
      { timestamp: Date.now(), durationMs: 15, statusCode: 400 },
      { timestamp: Date.now(), durationMs: 20, statusCode: 500 },
    ]

    const snapshot = MetricsAggregator.aggregate('prj-1', 'production', samples, 10000)

    expect(snapshot.totalRequests).toBe(4)
    expect(snapshot.errorRate4xx).toBe(25)
    expect(snapshot.errorRate5xx).toBe(25)
    expect(snapshot.rps).toBe(0.4)
  })

  it('3. MetricsCollector operates fail-open with bounded buffer', () => {
    const collector = new MetricsCollector('prj-1', 'production', { maxBufferSize: 5 })

    for (let i = 0; i < 10; i++) {
      collector.recordRequest(i * 10, 200)
    }

    const snapshot = collector.getSnapshot(60000)
    // Buffer size capped at 5
    expect(snapshot.totalRequests).toBe(5)
  })
})
