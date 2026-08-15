/**
 * @solarch/core-client - CapabilityService
 */

import type { HealthResponse, ServerCapabilities } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class CapabilityService {
  private cachedCapabilities: ServerCapabilities | null = null

  constructor(readonly client: HttpClient) {}

  async get(): Promise<ServerCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities
    }

    const health = await this.client.get<HealthResponse>('/api/health')
    const provider = (health?.database || 'sqlite').toLowerCase()

    const capabilities: ServerCapabilities = {
      protocolVersion: '1.0',
      database: {
        provider,
        transactions: provider !== 'mongodb' && provider !== 'neon',
        vectorSearch: provider === 'sqlite' || provider === 'postgres' || provider === 'mongodb',
        backups: provider === 'sqlite',
      },
      realtime: {
        websocket: true,
        sse: true,
      },
      features: {
        oauth2: true,
        otp: true,
        files: true,
        mfa: true,
      },
    }

    this.cachedCapabilities = capabilities
    return capabilities
  }

  async getDatabaseProvider(): Promise<string> {
    const caps = await this.get()
    return caps.database.provider
  }

  async supportsTransactions(): Promise<boolean> {
    const caps = await this.get()
    return caps.database.transactions
  }

  async supportsVectorSearch(): Promise<boolean> {
    const caps = await this.get()
    return caps.database.vectorSearch
  }

  async supportsBackups(): Promise<boolean> {
    const caps = await this.get()
    return caps.database.backups
  }

  clearCache(): void {
    this.cachedCapabilities = null
  }
}
