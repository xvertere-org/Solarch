/**
 * Solarch Platform Service API Client (Phase 9)
 *
 * Provides scoped API communications for production service management.
 */

import { PlatformClient } from '../client/platform-client.js'
import {
  MaintenanceConfig,
  ServiceHealthDashboard,
  ServiceTopologySpec,
  TrafficAllocation,
} from './types.js'

export class ServiceClient {
  private platformClient: PlatformClient

  constructor(platformClient: PlatformClient) {
    this.platformClient = platformClient
  }

  public async getDashboard(
    projectId: string,
    environment: string,
    token?: string
  ): Promise<ServiceHealthDashboard> {
    return this.platformClient.get<ServiceHealthDashboard>(
      `/v1/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(environment)}/status`,
      { token }
    )
  }

  public async scaleService(
    projectId: string,
    environment: string,
    spec: Partial<ServiceTopologySpec>,
    force: boolean = false,
    token?: string
  ): Promise<{ success: boolean; topology: ServiceTopologySpec; warning?: string }> {
    return this.platformClient.post<{ success: boolean; topology: ServiceTopologySpec; warning?: string }>(
      `/v1/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(environment)}/scale`,
      { ...spec, force },
      { token }
    )
  }

  public async setMaintenance(
    projectId: string,
    environment: string,
    config: { enabled: boolean; message?: string },
    token?: string
  ): Promise<MaintenanceConfig> {
    return this.platformClient.post<MaintenanceConfig>(
      `/v1/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(environment)}/maintenance`,
      config,
      { token }
    )
  }

  public async setTraffic(
    projectId: string,
    environment: string,
    allocation: { canaryDeploymentId: string; weight: number; force?: boolean },
    token?: string
  ): Promise<{ success: boolean; allocations: TrafficAllocation[]; warning?: string }> {
    return this.platformClient.post<{ success: boolean; allocations: TrafficAllocation[]; warning?: string }>(
      `/v1/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(environment)}/traffic`,
      allocation,
      { token }
    )
  }

  public async resetCircuitBreaker(
    projectId: string,
    environment: string,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.platformClient.post<{ success: boolean; message: string }>(
      `/v1/projects/${encodeURIComponent(projectId)}/services/${encodeURIComponent(environment)}/circuit-breaker/reset`,
      {},
      { token }
    )
  }
}
