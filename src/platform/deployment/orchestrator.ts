/**
 * Solarch Platform Deployment Lifecycle Orchestrator (Phase 7)
 *
 * Implements deployment status machine, polling, health gating, and traffic promotion.
 */

import { DeploymentClient } from './client.js'
import { DeploymentBundleSpec, DeploymentRecord, DeploymentStatus } from './types.js'

export interface OrchestratorOptions {
  timeoutMs?: number
  pollIntervalMs?: number
  onStatusChange?: (status: DeploymentStatus, record: DeploymentRecord) => void
}

export class DeploymentOrchestrator {
  private client: DeploymentClient
  private options: OrchestratorOptions

  constructor(client: DeploymentClient, options: OrchestratorOptions = {}) {
    this.client = client
    this.options = {
      timeoutMs: 120000,
      pollIntervalMs: 1000,
      ...options,
    }
  }

  /**
   * Submits a deployment and awaits completion through all lifecycle phases.
   */
  public async deployAndAwait(
    spec: DeploymentBundleSpec,
    accessToken: string
  ): Promise<DeploymentRecord> {
    const initialRecord = await this.client.submitDeployment(spec, accessToken)

    if (
      initialRecord.status === 'active' ||
      initialRecord.status === 'failed' ||
      initialRecord.status === 'cancelled'
    ) {
      return initialRecord
    }

    const startTime = Date.now()
    const timeoutMs = this.options.timeoutMs || 120000
    const pollInterval = this.options.pollIntervalMs || 1000

    let currentRecord = initialRecord
    let lastStatus: DeploymentStatus = initialRecord.status

    while (
      currentRecord.status === 'queued' ||
      currentRecord.status === 'building' ||
      currentRecord.status === 'deploying' ||
      currentRecord.status === 'health_checking' ||
      currentRecord.status === 'healthy' ||
      currentRecord.status === 'promoting'
    ) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Deployment timed out after ${timeoutMs}ms (Deployment ID: ${currentRecord.deploymentId}).`
        )
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))

      currentRecord = await this.client.getDeployment(
        spec.projectId,
        currentRecord.deploymentId,
        accessToken
      )

      if (currentRecord.status !== lastStatus) {
        lastStatus = currentRecord.status
        if (this.options.onStatusChange) {
          this.options.onStatusChange(currentRecord.status, currentRecord)
        }
      }
    }

    if (currentRecord.status === 'failed' || currentRecord.status === 'unhealthy') {
      throw new Error(
        `Deployment failed with status "${currentRecord.status}": ${currentRecord.error || 'Check deployment logs for details.'}`
      )
    }

    return currentRecord
  }
}
