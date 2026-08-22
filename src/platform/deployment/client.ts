/**
 * Solarch Platform Deployment API Client (Phase 7)
 */

import { PlatformClient } from '../client/platform-client.js'
import { DeploymentBundleSpec, DeploymentRecord } from './types.js'

export class DeploymentClient {
  private client: PlatformClient

  constructor(client: PlatformClient) {
    this.client = client
  }

  /**
   * Submits a new deployment for a project environment.
   */
  public async submitDeployment(
    spec: DeploymentBundleSpec,
    accessToken: string
  ): Promise<DeploymentRecord> {
    return this.client.post<DeploymentRecord>(
      `/v1/projects/${encodeURIComponent(spec.projectId)}/deployments`,
      spec,
      { token: accessToken }
    )
  }

  /**
   * Fetches deployment details and status.
   */
  public async getDeployment(
    projectId: string,
    deploymentId: string,
    accessToken: string
  ): Promise<DeploymentRecord> {
    return this.client.get<DeploymentRecord>(
      `/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}`,
      { token: accessToken }
    )
  }

  /**
   * Lists all deployments for a project environment.
   */
  public async listDeployments(
    projectId: string,
    environment: string | undefined,
    accessToken: string
  ): Promise<DeploymentRecord[]> {
    const query = environment ? `?env=${encodeURIComponent(environment)}` : ''
    return this.client.get<DeploymentRecord[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/deployments${query}`,
      { token: accessToken }
    )
  }

  /**
   * Rolls back traffic to a specified target deployment.
   */
  public async rollbackDeployment(
    projectId: string,
    environment: string,
    targetDeploymentId: string,
    accessToken: string
  ): Promise<DeploymentRecord> {
    return this.client.post<DeploymentRecord>(
      `/v1/projects/${encodeURIComponent(projectId)}/deployments/rollback`,
      { environment, targetDeploymentId },
      { token: accessToken }
    )
  }

  /**
   * Retrieves build and execution logs for a deployment.
   */
  public async getDeploymentLogs(
    projectId: string,
    deploymentId: string,
    accessToken: string
  ): Promise<string[]> {
    return this.client.get<string[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/logs`,
      { token: accessToken }
    )
  }
}
