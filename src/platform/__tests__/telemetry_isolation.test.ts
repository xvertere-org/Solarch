import { describe, it, expect, vi } from 'vitest'
import { TelemetryClient } from '../telemetry/client.js'
import { PlatformClient } from '../client/platform-client.js'
import { PlatformConfig } from '../config.js'

describe('Telemetry Project & Environment Isolation (Phase 8)', () => {
  it('1. Constructs properly scoped requests for metrics by project and environment', async () => {
    const mockPlatformClient = {
      get: vi.fn().mockResolvedValue({
        projectId: 'prj-alpha',
        environment: 'production',
        totalRequests: 100,
      }),
    } as unknown as PlatformClient

    const client = new TelemetryClient(mockPlatformClient)
    await client.getMetrics('prj-alpha', 'production', 60000, 'tok-1')

    expect(mockPlatformClient.get).toHaveBeenCalledWith(
      '/v1/projects/prj-alpha/metrics?env=production&window=60000',
      { token: 'tok-1' }
    )
  })

  it('2. Enforces environment parameter in log queries', async () => {
    const mockPlatformClient = {
      get: vi.fn().mockResolvedValue([]),
    } as unknown as PlatformClient

    const client = new TelemetryClient(mockPlatformClient)
    await client.getLogs('prj-beta', 'staging', { limit: 10 }, 'tok-2')

    expect(mockPlatformClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/projects/prj-beta/logs?env=staging&limit=10'),
      { token: 'tok-2' }
    )
  })
})
