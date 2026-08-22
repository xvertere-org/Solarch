/**
 * Solarch Platform Database Provisioning API Client (Phase 6)
 */

import { PlatformClient } from '../client/platform-client.js'
import { ProvisionRequest, ProvisionOperation, DatabaseMetadataSpec } from './types.js'

export class DatabaseProvisionClient {
  private client: PlatformClient

  constructor(client: PlatformClient) {
    this.client = client
  }

  /**
   * Submits a database provisioning request.
   */
  public async submitProvision(
    request: ProvisionRequest,
    accessToken: string
  ): Promise<ProvisionOperation> {
    return this.client.post<ProvisionOperation>(
      `/v1/projects/${encodeURIComponent(request.projectId)}/database/provision`,
      request,
      {
        token: accessToken,
        headers: request.idempotencyKey ? { 'Idempotency-Key': request.idempotencyKey } : undefined,
      }
    )
  }

  /**
   * Retrieves the current status of an ongoing provisioning operation.
   */
  public async getOperationStatus(
    projectId: string,
    operationId: string,
    accessToken: string
  ): Promise<ProvisionOperation> {
    return this.client.get<ProvisionOperation>(
      `/v1/projects/${encodeURIComponent(projectId)}/database/operations/${encodeURIComponent(operationId)}`,
      { token: accessToken }
    )
  }

  /**
   * Retrieves the database topology metadata for a project environment.
   */
  public async getTopology(
    projectId: string,
    environment: string,
    accessToken: string
  ): Promise<DatabaseMetadataSpec> {
    return this.client.get<DatabaseMetadataSpec>(
      `/v1/projects/${encodeURIComponent(projectId)}/database/topology?env=${encodeURIComponent(environment)}`,
      { token: accessToken }
    )
  }
}
