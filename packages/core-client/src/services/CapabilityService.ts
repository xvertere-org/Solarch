/**
 * @solarch/core-client - CapabilityService
 * Strictly consumes actual server health and status information without speculative feature inference.
 */

import type { ServerHealthInfo } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class CapabilityService {
  private cachedHealth: ServerHealthInfo | null = null

  constructor(readonly client: HttpClient) {}

  /**
   * Queries the server /api/health endpoint and returns the actual server health and status payload.
   */
  async getHealth(): Promise<ServerHealthInfo> {
    if (this.cachedHealth) {
      return this.cachedHealth
    }
    const health = await this.client.get<ServerHealthInfo>('/api/health')
    this.cachedHealth = health
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
  }
}
