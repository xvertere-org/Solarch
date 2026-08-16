/**
 * @solarch/core-client - CapabilityService
 * Strictly consumes actual server health and status information without speculative feature inference.
 */

import type { ServerHealthInfo } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class CapabilityService {
  private cachedHealth: ServerHealthInfo | null = null
  private lastCachedAt: number = 0
  private cacheTtl: number

  constructor(
    readonly client: HttpClient,
    options: { cacheTtl?: number } = {}
  ) {
    this.cacheTtl = options.cacheTtl ?? 30_000 // 30s TTL default
  }

  /**
   * Queries the server /api/health endpoint and returns the actual server health and status payload.
   * Result is cached for the configured TTL (default: 30s).
   */
  async getHealth(): Promise<ServerHealthInfo> {
    const now = Date.now()
    if (this.cachedHealth && now - this.lastCachedAt < this.cacheTtl) {
      return this.cachedHealth
    }
    const health = await this.client.get<ServerHealthInfo>('/api/health')
    this.cachedHealth = health
    this.lastCachedAt = Date.now()
    return health
  }

  /**
   * Evaluates if the backend server reports a healthy operational status.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth()
      if (health.status === 'ok') return true
      if (health.code === 200) return true
      if (health.message && health.message.toLowerCase() === 'healthy') return true
      return false
    } catch {
      return false
    }
  }

  /**
   * Alias for getHealth() to maintain clean canonical surface.
   */
  async get(): Promise<ServerHealthInfo> {
    return this.getHealth()
  }

  clearCache(): void {
    this.cachedHealth = null
    this.lastCachedAt = 0
  }
}
