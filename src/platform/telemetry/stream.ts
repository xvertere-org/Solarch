/**
 * Solarch Resilient Telemetry Streaming Engine (Phase 8)
 *
 * Implements bounded exponential backoff with jitter and clean cancellation.
 */

export interface RetryPolicy {
  initialDelayMs?: number
  maxDelayMs?: number
  factor?: number
  jitterPercent?: number
  maxRetries?: number
}

export class TelemetryStream<T> {
  private fetchFn: () => Promise<T[]>
  private onDataCallback?: (items: T[]) => void
  private onErrorCallback?: (err: any) => void
  private running: boolean = false
  private cancelled: boolean = false
  private retryCount: number = 0
  private policy: Required<RetryPolicy>

  constructor(fetchFn: () => Promise<T[]>, policy: RetryPolicy = {}) {
    this.fetchFn = fetchFn
    this.policy = {
      initialDelayMs: policy.initialDelayMs || 500,
      maxDelayMs: policy.maxDelayMs || 10000,
      factor: policy.factor || 2,
      jitterPercent: policy.jitterPercent || 20,
      maxRetries: policy.maxRetries || 50,
    }
  }

  /**
   * Calculates next backoff delay with exponential factor and random jitter.
   */
  public getBackoffDelay(attempt: number): number {
    const rawDelay = this.policy.initialDelayMs * Math.pow(this.policy.factor, attempt)
    const cappedDelay = Math.min(rawDelay, this.policy.maxDelayMs)

    // Apply jitter (+/- jitterPercent)
    const jitterDelta = cappedDelay * (this.policy.jitterPercent / 100)
    const randomFactor = (Math.random() * 2 - 1) * jitterDelta
    return Math.max(0, Math.round(cappedDelay + randomFactor))
  }

  /**
   * Registers data listener.
   */
  public onData(callback: (items: T[]) => void): this {
    this.onDataCallback = callback
    return this
  }

  /**
   * Registers error listener.
   */
  public onError(callback: (err: any) => void): this {
    this.onErrorCallback = callback
    return this
  }

  /**
   * Starts streaming with resilient loop.
   */
  public async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.cancelled = false
    this.retryCount = 0

    while (this.running && !this.cancelled) {
      try {
        const items = await this.fetchFn()
        this.retryCount = 0 // Reset on successful fetch

        if (this.onDataCallback && items.length > 0) {
          this.onDataCallback(items)
        }

        // Standard poll interval after successful retrieval
        await this.sleep(1000)
      } catch (err: any) {
        if (this.cancelled) break

        if (this.onErrorCallback) {
          this.onErrorCallback(err)
        }

        this.retryCount++
        if (this.retryCount > this.policy.maxRetries) {
          this.running = false
          throw new Error(`Streaming failed: exceeded maximum retries (${this.policy.maxRetries})`)
        }

        const delay = this.getBackoffDelay(this.retryCount)
        await this.sleep(delay)
      }
    }
  }

  /**
   * Cancels streaming immediately and cleans up.
   */
  public cancel(): void {
    this.cancelled = true
    this.running = false
  }

  public isRunning(): boolean {
    return this.running
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
