/**
 * Solarch Platform Capabilities & Configuration Client (Phase 4)
 */

import { PlatformClient } from './platform-client.js'
import { PlatformProjectConfig } from '../schema/project-config.js'

export class CapabilitiesClient {
  private client: PlatformClient

  constructor(client: PlatformClient) {
    this.client = client
  }

  public async getProjectConfig(
    projectId: string,
    token: string,
    environment?: string
  ): Promise<PlatformProjectConfig> {
    const envParam = environment ? `?environment=${encodeURIComponent(environment)}` : ''
    return this.client.get<PlatformProjectConfig>(
      `/v1/projects/${encodeURIComponent(projectId)}/config${envParam}`,
      { token }
    )
  }

  public async updateProjectConfig(
    projectId: string,
    config: Partial<PlatformProjectConfig>,
    token: string
  ): Promise<PlatformProjectConfig> {
    return this.client.put<PlatformProjectConfig>(
      `/v1/projects/${encodeURIComponent(projectId)}/config`,
      config,
      { token }
    )
  }
}
