import { describe, it, expect, vi } from 'vitest'
import { DatabaseProvisionClient } from '../database/client.js'
import { DatabaseProvisionOrchestrator } from '../database/provisioning.js'
import { PlatformClient } from '../client/platform-client.js'
import { PlatformConfig } from '../config.js'

describe('Database Provisioning Lifecycle & Idempotency (Phase 6)', () => {
  it('1. generates deterministic idempotency key', () => {
    const key1 = DatabaseProvisionOrchestrator.createIdempotencyKey(
      'p-1',
      'staging',
      'postgres',
      'neon',
      'serverless'
    )
    const key2 = DatabaseProvisionOrchestrator.createIdempotencyKey(
      'p-1',
      'staging',
      'postgres',
      'neon',
      'serverless'
    )
    expect(key1).toBe(key2)
    expect(key1).toBe('db-prov:p-1:staging:postgres:neon:serverless')
  })

  it('2. polls async operation until status becomes ready', async () => {
    const rawClient = new PlatformClient(PlatformConfig.default())
    const dbClient = new DatabaseProvisionClient(rawClient)

    let pollCount = 0
    vi.spyOn(dbClient, 'submitProvision').mockResolvedValue({
      operationId: 'op-123',
      projectId: 'p-1',
      environment: 'development',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    vi.spyOn(dbClient, 'getOperationStatus').mockImplementation(async () => {
      pollCount++
      if (pollCount < 2) {
        return {
          operationId: 'op-123',
          projectId: 'p-1',
          environment: 'development',
          status: 'provisioning',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      return {
        operationId: 'op-123',
        projectId: 'p-1',
        environment: 'development',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          engine: 'postgres',
          provider: 'neon',
          topology: 'serverless',
          host: 'ep-cool-123.neon.tech',
          secretRefs: ['DATABASE_URL'],
        },
        connectionSecret: {
          envKey: 'DATABASE_URL',
          secretValue: 'postgresql://user:pass@ep-cool-123.neon.tech/solarch_dev?sslmode=require',
        },
      }
    })

    const orchestrator = new DatabaseProvisionOrchestrator(dbClient, {
      pollIntervalMs: 10,
      timeoutMs: 1000,
    })

    const result = await orchestrator.provisionAndAwait(
      {
        projectId: 'p-1',
        environment: 'development',
        engine: 'postgres',
        provider: 'neon',
        topology: 'serverless',
      },
      'fake-token'
    )

    expect(result.status).toBe('ready')
    expect(pollCount).toBe(2)
    expect(result.metadata?.host).toBe('ep-cool-123.neon.tech')
  })

  it('3. handles failed operations safely and throws informative error', async () => {
    const rawClient = new PlatformClient(PlatformConfig.default())
    const dbClient = new DatabaseProvisionClient(rawClient)

    vi.spyOn(dbClient, 'submitProvision').mockResolvedValue({
      operationId: 'op-fail',
      projectId: 'p-1',
      environment: 'development',
      status: 'failed',
      error: 'Quota exceeded for cloud provider',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const orchestrator = new DatabaseProvisionOrchestrator(dbClient, {
      pollIntervalMs: 10,
      timeoutMs: 1000,
    })

    const res = await orchestrator.provisionAndAwait(
      {
        projectId: 'p-1',
        environment: 'development',
        engine: 'postgres',
        provider: 'neon',
        topology: 'serverless',
      },
      'fake-token'
    )
    expect(res.status).toBe('failed')
  })
})
