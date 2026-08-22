import { describe, it, expect, vi } from 'vitest'
import { DeploymentOrchestrator } from '../deployment/orchestrator.js'
import { DeploymentClient } from '../deployment/client.js'
import { DeploymentBundleSpec, DeploymentRecord, DeploymentStatus } from '../deployment/types.js'

describe('Deployment Lifecycle & Health Gating (Phase 7)', () => {
  const sampleSpec: DeploymentBundleSpec = {
    projectId: 'prj-100',
    environment: 'production',
    bundleHash: 'sha256:abc123def456',
    runtimeVersion: '0.19.8',
    cliVersion: '0.19.8',
    entrypoint: 'src/index.ts',
    healthCheck: {
      path: '/api/health',
      method: 'GET',
      expectedStatus: 200,
      timeoutMs: 5000,
      retries: 3,
    },
    createdAt: new Date().toISOString(),
  }

  it('1. Progresses through queued -> building -> deploying -> health_checking -> active lifecycle', async () => {
    const states: DeploymentStatus[] = [
      'queued',
      'building',
      'deploying',
      'health_checking',
      'healthy',
      'promoting',
      'active',
    ]
    let stateIdx = 0

    const mockClient = {
      submitDeployment: vi.fn().mockResolvedValue({
        deploymentId: 'dep-101',
        projectId: 'prj-100',
        environment: 'production',
        status: 'queued',
        bundleHash: sampleSpec.bundleHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as DeploymentRecord),
      getDeployment: vi.fn().mockImplementation(async () => {
        stateIdx = Math.min(stateIdx + 1, states.length - 1)
        return {
          deploymentId: 'dep-101',
          projectId: 'prj-100',
          environment: 'production',
          status: states[stateIdx],
          bundleHash: sampleSpec.bundleHash,
          deploymentUrl: states[stateIdx] === 'active' ? 'https://app.solarch.cloud' : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as DeploymentRecord
      }),
    } as unknown as DeploymentClient

    const orchestrator = new DeploymentOrchestrator(mockClient, {
      pollIntervalMs: 5,
    })

    const finalRecord = await orchestrator.deployAndAwait(sampleSpec, 'token-123')

    expect(finalRecord.status).toBe('active')
    expect(finalRecord.deploymentUrl).toBe('https://app.solarch.cloud')
  })

  it('2. Never promotes traffic if health check fails', async () => {
    let callCount = 0

    const mockClient = {
      submitDeployment: vi.fn().mockResolvedValue({
        deploymentId: 'dep-102',
        projectId: 'prj-100',
        environment: 'production',
        status: 'deploying',
        bundleHash: sampleSpec.bundleHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as DeploymentRecord),
      getDeployment: vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return {
            deploymentId: 'dep-102',
            projectId: 'prj-100',
            environment: 'production',
            status: 'health_checking',
            bundleHash: sampleSpec.bundleHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
        return {
          deploymentId: 'dep-102',
          projectId: 'prj-100',
          environment: 'production',
          status: 'unhealthy',
          error: 'Health check returned HTTP 500: Database connection pool exhausted',
          bundleHash: sampleSpec.bundleHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
    } as unknown as DeploymentClient

    const orchestrator = new DeploymentOrchestrator(mockClient, {
      pollIntervalMs: 5,
    })

    await expect(orchestrator.deployAndAwait(sampleSpec, 'token-123')).rejects.toThrow(
      /Deployment failed with status "unhealthy": Health check returned HTTP 500/
    )
  })
})
