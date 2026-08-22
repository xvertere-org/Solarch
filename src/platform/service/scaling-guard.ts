/**
 * Solarch Service Scaling & Cost Guard (Phase 9)
 *
 * Enforces safety limits on compute instances and resources to prevent accidental runaway costs.
 */

import { ScalingPolicy, ServiceTopologySpec } from './types.js'

export class ScalingGuard {
  private policy: ScalingPolicy

  constructor(policy?: Partial<ScalingPolicy>) {
    this.policy = {
      maxInstances: policy?.maxInstances ?? 20,
      maxMemoryMb: policy?.maxMemoryMb ?? 4096,
      maxCpuMilli: policy?.maxCpuMilli ?? 4000,
      enforceLimits: policy?.enforceLimits ?? true,
    }
  }

  public getPolicy(): ScalingPolicy {
    return { ...this.policy }
  }

  /**
   * Validates requested topology changes against safety limits.
   */
  public validate(
    current: ServiceTopologySpec,
    requested: Partial<ServiceTopologySpec>,
    force: boolean = false
  ): { valid: boolean; error?: string; warning?: string } {
    const instances = requested.instances ?? current.instances
    const memoryMb = requested.memoryMb ?? current.memoryMb
    const cpuMilli = requested.cpuMilli ?? current.cpuMilli

    if (instances < 1 && !force) {
      return {
        valid: false,
        error: 'Instances cannot be scaled to 0 without --force (use maintenance or stop instead).',
      }
    }

    if (this.policy.enforceLimits && !force) {
      if (instances > this.policy.maxInstances) {
        return {
          valid: false,
          error: `Requested instances (${instances}) exceeds safety limit of ${this.policy.maxInstances}. Pass --force to override.`,
        }
      }

      if (memoryMb > this.policy.maxMemoryMb) {
        return {
          valid: false,
          error: `Requested memory (${memoryMb} MB) exceeds safety limit of ${this.policy.maxMemoryMb} MB. Pass --force to override.`,
        }
      }

      if (cpuMilli > this.policy.maxCpuMilli) {
        return {
          valid: false,
          error: `Requested CPU (${cpuMilli}m) exceeds safety limit of ${this.policy.maxCpuMilli}m. Pass --force to override.`,
        }
      }
    }

    let warning: string | undefined
    if (force && (instances > this.policy.maxInstances || memoryMb > this.policy.maxMemoryMb || cpuMilli > this.policy.maxCpuMilli)) {
      warning = `Caution: Scaling overrides configured policy limit (Instances: ${instances}/${this.policy.maxInstances}, Memory: ${memoryMb}/${this.policy.maxMemoryMb}MB, CPU: ${cpuMilli}/${this.policy.maxCpuMilli}m).`
    }

    return { valid: true, warning }
  }
}
