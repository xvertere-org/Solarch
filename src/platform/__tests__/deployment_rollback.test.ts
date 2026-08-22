import { describe, it, expect, vi } from 'vitest'
import { DeploymentRollbackManager } from '../deployment/rollback.js'
import { DeploymentClient } from '../deployment/client.js'
import { DeploymentRecord } from '../deployment/types.js'

describe('Deployment Rollback Safety & Eligibility (Phase 7)', () => {
  it('1. Approves rollback for a previously healthy or active deployment in the same environment', () => {
    const validTarget: DeploymentRecord = {
      deploymentId: 'dep-good',
      projectId: 'prj-100',
      environment: 'production',
      status: 'active',
      bundleHash: 'sha256:1111',
      createdAt: '2026-08-22T00:00:00.000Z',
      updatedAt: '2026-08-22T00:00:00.000Z',
    }

    const check = DeploymentRollbackManager.validateRollbackTarget(validTarget, 'production')
    expect(check.eligible).toBe(true)
  })

  it('2. Rejects rollback across different environments', () => {
    const crossEnvTarget: DeploymentRecord = {
      deploymentId: 'dep-staging',
      projectId: 'prj-100',
      environment: 'staging',
      status: 'active',
      bundleHash: 'sha256:2222',
      createdAt: '2026-08-22T00:00:00.000Z',
      updatedAt: '2026-08-22T00:00:00.000Z',
    }

    const check = DeploymentRollbackManager.validateRollbackTarget(crossEnvTarget, 'production')
    expect(check.eligible).toBe(false)
    expect(check.error).toContain('Cannot rollback to deployment from different environment')
  })

  it('3. Rejects rollback to a failed or unhealthy deployment', () => {
    const failedTarget: DeploymentRecord = {
      deploymentId: 'dep-failed',
      projectId: 'prj-100',
      environment: 'production',
      status: 'failed',
      bundleHash: 'sha256:3333',
      createdAt: '2026-08-22T00:00:00.000Z',
      updatedAt: '2026-08-22T00:00:00.000Z',
    }

    const check = DeploymentRollbackManager.validateRollbackTarget(failedTarget, 'production')
    expect(check.eligible).toBe(false)
    expect(check.error).toContain('Cannot rollback to deployment with status "failed"')
  })

  it('4. Executes rollback via API client when valid', async () => {
    const mockClient = {
      getDeployment: vi.fn().mockResolvedValue({
        deploymentId: 'dep-target',
        projectId: 'prj-100',
        environment: 'production',
        status: 'active',
        bundleHash: 'sha256:4444',
      }),
      rollbackDeployment: vi.fn().mockResolvedValue({
        deploymentId: 'dep-target',
        projectId: 'prj-100',
        environment: 'production',
        status: 'active',
        bundleHash: 'sha256:4444',
        deploymentUrl: 'https://app.solarch.cloud',
      }),
    } as unknown as DeploymentClient

    const result = await DeploymentRollbackManager.executeRollback(
      mockClient,
      'prj-100',
      'production',
      'dep-target',
      'token-123'
    )

    expect(result.deploymentId).toBe('dep-target')
    expect(mockClient.rollbackDeployment).toHaveBeenCalledWith(
      'prj-100',
      'production',
      'dep-target',
      'token-123'
    )
  })
})
