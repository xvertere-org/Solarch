import { describe, it, expect, vi } from 'vitest'
import { TelemetryStream } from '../telemetry/stream.js'

describe('Telemetry Stream Resilient Backoff & Cancellation (Phase 8)', () => {
  it('1. Computes exponential backoff with bounded upper limit and jitter', () => {
    const stream = new TelemetryStream(async () => [], {
      initialDelayMs: 100,
      maxDelayMs: 1000,
      factor: 2,
      jitterPercent: 10,
    })

    const delay0 = stream.getBackoffDelay(0)
    expect(delay0).toBeGreaterThanOrEqual(90)
    expect(delay0).toBeLessThanOrEqual(110)

    const delay1 = stream.getBackoffDelay(1) // 200ms +/- 10%
    expect(delay1).toBeGreaterThanOrEqual(180)
    expect(delay1).toBeLessThanOrEqual(220)

    const delayMax = stream.getBackoffDelay(10) // capped at 1000ms +/- 10%
    expect(delayMax).toBeGreaterThanOrEqual(900)
    expect(delayMax).toBeLessThanOrEqual(1100)
  })

  it('2. Stops retrying when stream is explicitly cancelled', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Connection lost'))
    const stream = new TelemetryStream(fetchFn, {
      initialDelayMs: 10,
      maxDelayMs: 20,
    })

    const streamPromise = stream.start()
    stream.cancel()

    await streamPromise
    expect(stream.isRunning()).toBe(false)
  })
})
