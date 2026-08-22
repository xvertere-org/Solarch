/**
 * Solarch Staged Traffic & Canary Manager (Phase 9)
 *
 * Implements staged traffic progression, canary health enforcement, and routing validation.
 */

import { TrafficAllocation, TrafficPolicy } from './types.js'

export class TrafficManager {
  private policy: TrafficPolicy

  constructor(policy?: Partial<TrafficPolicy>) {
    this.policy = {
      maxCanaryWeight: policy?.maxCanaryWeight ?? 50,
      minimumEvaluationWindowMs: policy?.minimumEvaluationWindowMs ?? 60000,
      requireHealthyDeployment: policy?.requireHealthyDeployment ?? true,
      allowedStages: policy?.allowedStages ?? [10, 25, 50, 100],
    }
  }

  public getPolicy(): TrafficPolicy {
    return { ...this.policy }
  }

  /**
   * Validates and allocates traffic between primary and canary deployments.
   */
  public allocate(
    primaryDeploymentId: string,
    canaryDeploymentId: string,
    canaryWeight: number,
    canaryStatus: string,
    currentCanaryWeight: number = 0,
    force: boolean = false
  ): { valid: boolean; allocations?: TrafficAllocation[]; error?: string; warning?: string } {
    if (canaryWeight < 0 || canaryWeight > 100) {
      return { valid: false, error: 'Traffic weight must be between 0 and 100.' }
    }

    if (this.policy.requireHealthyDeployment && canaryStatus !== 'healthy' && canaryStatus !== 'active' && !force) {
      return {
        valid: false,
        error: `Cannot allocate traffic to canary deployment "${canaryDeploymentId}" with status "${canaryStatus}". Candidate must be healthy.`,
      }
    }

    if (!force && canaryWeight > this.policy.maxCanaryWeight && canaryWeight < 100) {
      return {
        valid: false,
        error: `Canary weight (${canaryWeight}%) exceeds maximum canary limit of ${this.policy.maxCanaryWeight}%. Use stepped promotion or full promotion (100%).`,
      }
    }

    // Validate stepped progression if not forced and not tearing down (canaryWeight > currentCanaryWeight)
    if (!force && canaryWeight > currentCanaryWeight && canaryWeight < 100) {
      const nextAllowedStage = this.getNextAllowedStage(currentCanaryWeight)
      if (canaryWeight > nextAllowedStage) {
        return {
          valid: false,
          error: `Skipped stage progression: cannot jump from ${currentCanaryWeight}% directly to ${canaryWeight}%. Next allowed stage is ${nextAllowedStage}%. Pass --force to override.`,
        }
      }
    }

    const now = new Date().toISOString()
    const allocations: TrafficAllocation[] = []

    if (canaryWeight === 100) {
      allocations.push({
        deploymentId: canaryDeploymentId,
        weight: 100,
        isCanary: false,
        allocatedAt: now,
      })
    } else if (canaryWeight === 0) {
      allocations.push({
        deploymentId: primaryDeploymentId,
        weight: 100,
        isCanary: false,
        allocatedAt: now,
      })
    } else {
      allocations.push(
        {
          deploymentId: primaryDeploymentId,
          weight: 100 - canaryWeight,
          isCanary: false,
          allocatedAt: now,
        },
        {
          deploymentId: canaryDeploymentId,
          weight: canaryWeight,
          isCanary: true,
          allocatedAt: now,
        }
      )
    }

    return { valid: true, allocations }
  }

  private getNextAllowedStage(currentWeight: number): number {
    for (const stage of this.policy.allowedStages) {
      if (stage > currentWeight) {
        return stage
      }
    }
    return 100
  }
}
