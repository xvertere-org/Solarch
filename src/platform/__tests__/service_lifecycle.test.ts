import { describe, it, expect } from 'vitest'
import { ServiceLifecycleManager } from '../service/lifecycle.js'

describe('Service Lifecycle Orchestrator (Phase 9)', () => {
  it('1. Initializes in HEALTHY state and produces complete dashboard view', () => {
    const manager = new ServiceLifecycleManager('prj-1', 'production', {
      topology: { instances: 3, memoryMb: 1024, cpuMilli: 1000 },
      activeDeployment: { id: 'dep_100', version: '1.0.0', bundleHash: 'sha_100' },
    })

    expect(manager.getState()).toBe('HEALTHY')
    const dashboard = manager.getDashboard('Healthy', [{ name: 'stripe', version: '1.0.0', status: 'Active' }])

    expect(dashboard.projectId).toBe('prj-1')
    expect(dashboard.environment).toBe('production')
    expect(dashboard.state).toBe('HEALTHY')
    expect(dashboard.topology.instances).toBe(3)
    expect(dashboard.activeDeployment.id).toBe('dep_100')
    expect(dashboard.plugins[0].name).toBe('stripe')
  })

  it('2. Enforces scaling limits and records audit events', () => {
    const manager = new ServiceLifecycleManager('prj-1', 'production', {
      scalingPolicy: { maxInstances: 5, enforceLimits: true },
    })

    // Exceeding limit without force fails
    const failScale = manager.scale({ instances: 10 }, 'developer', false)
    expect(failScale.success).toBe(false)
    expect(failScale.error).toContain('exceeds safety limit of 5')

    // Force override succeeds with warning
    const forceScale = manager.scale({ instances: 10 }, 'admin', true)
    expect(forceScale.success).toBe(true)
    expect(forceScale.warning).toContain('Caution: Scaling overrides configured policy limit')
    expect(manager.getTopology().instances).toBe(10)

    const audits = manager.getAuditEvents()
    expect(audits.some((a) => a.action === 'service.scale' && a.actor === 'admin')).toBe(true)
  })

  it('3. Manages maintenance mode with HTTP 503 state', () => {
    const manager = new ServiceLifecycleManager('prj-1', 'production')

    const maintOn = manager.setMaintenance(true, 'Database migration in progress', 'ops_lead')
    expect(maintOn.enabled).toBe(true)
    expect(maintOn.statusCode).toBe(503)
    expect(manager.getState()).toBe('MAINTENANCE')

    const maintOff = manager.setMaintenance(false, undefined, 'ops_lead')
    expect(maintOff.enabled).toBe(false)
    expect(manager.getState()).toBe('HEALTHY')

    const audits = manager.getAuditEvents()
    expect(audits.some((a) => a.action === 'service.maintenance.enabled')).toBe(true)
    expect(audits.some((a) => a.action === 'service.maintenance.disabled')).toBe(true)
  })
})
