/**
 * Solarch Platform Rollback Validator & Execution Manager (Phase 7)
 */

import { DeploymentClient } from './client.js'
import { DeploymentRecord } from './types.js'

export class DeploymentRollbackManager {
  /**
   * Validates if a target deployment is eligible for rollback.
   */
  public static validateRollbackTarget(
    targetRecord: DeploymentRecord,
    currentEnvironment: string
  ): { eligible: boolean; error?: string } {
    if (targetRecord.environment !== currentEnvironment) {
      return {
        eligible: false,
        error: `Cannot rollback to deployment from different environment: "${targetRecord.environment}" (current: "${currentEnvironment}").`,
      }
    }

    if (
      targetRecord.status !== 'active' &&
      targetRecord.status !== 'healthy' &&
      targetRecord.status !== 'rolled_back'
    ) {
      return {
        eligible: false,
        error: `Cannot rollback to deployment with status "${targetRecord.status}". Target must have been previously active or healthy.`,
      }
    }

    return { eligible: true }
  }

  /**
   * Executes rollback using DeploymentClient.
   */
  public static async executeRollback(
    client: DeploymentClient,
    projectId: string,
    environment: string,
    targetDeploymentId: string,
    accessToken: string
  ): Promise<DeploymentRecord> {
    const target = await client.getDeployment(projectId, targetDeploymentId, accessToken)
    const validation = DeploymentRollbackManager.validateRollbackTarget(target, environment)

    if (!validation.eligible) {
      throw new Error(`Rollback rejected: ${validation.error}`)
    }

    return client.rollbackDeployment(projectId, environment, targetDeploymentId, accessToken)
  }
}
