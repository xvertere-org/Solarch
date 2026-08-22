import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { McpRegistry } from '../mcp/registry.js'
import { McpAdapter } from '../mcp/adapter.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('MCP Tool Catalog & Capability Adapter (Phase 10)', () => {
  let tempDir: string
  let adapter: McpAdapter

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-mcp-tools-test-'))
    adapter = new McpAdapter()

    await ProjectMetadata.writeManifest(tempDir, {
      schemaVersion: 1,
      name: 'mcp-test-app',
      application: 'web',
      database: {
        engine: 'postgres',
        provider: 'neon',
        features: { vector: true },
      },
      runtimeVersion: '0.19.8',
      capabilities: {
        ai: { enabled: true, config: { vectorSearch: true } },
      },
      sdks: ['solarch-web', 'solarch-ai'],
      plugins: { mode: 'opt-in', list: ['auth-oauth'] },
    })
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. registers tools across all 5 core categories', () => {
    const allTools = McpRegistry.getAllTools()
    expect(allTools.length).toBeGreaterThanOrEqual(15)

    const categories = ['project', 'database', 'deployment', 'service', 'telemetry']
    for (const cat of categories) {
      const toolsInCat = McpRegistry.getToolsByCategory(cat as any)
      expect(toolsInCat.length).toBeGreaterThan(0)
    }
  })

  it('2. executes project inspection and configuration tools', async () => {
    const inspectRes = await adapter.executeTool('project.inspect', {}, { projectDir: tempDir, environment: 'development' })
    expect(inspectRes.exists).toBe(true)
    expect(inspectRes.manifest.name).toBe('mcp-test-app')

    const configRes = await adapter.executeTool('project.config', {}, { projectDir: tempDir, environment: 'production' })
    expect(configRes.environment).toBe('production')
    expect(configRes.capabilities.ai.enabled).toBe(true)

    const depsRes = await adapter.executeTool('project.dependencies', {}, { projectDir: tempDir, environment: 'development' })
    expect(depsRes.sdks).toBeDefined()
    expect(depsRes.plugins.length).toBeGreaterThan(0)
  })

  it('3. executes database and schema inspection tools', async () => {
    const statusRes = await adapter.executeTool('database.status', {}, { projectDir: tempDir, environment: 'development' })
    expect(statusRes.engine).toBe('postgres')
    expect(statusRes.provider).toBe('neon')
    expect(statusRes.connected).toBe(true)

    const schemaRes = await adapter.executeTool('database.schema.inspect', {}, { projectDir: tempDir, environment: 'development' })
    expect(schemaRes.tables.length).toBeGreaterThan(0)
    expect(schemaRes.vectorEnabled).toBe(true)
  })

  it('4. executes deployment and service management tools', async () => {
    const deployStatus = await adapter.executeTool('deployment.status', { deploymentId: 'dep_1' }, { projectDir: tempDir, environment: 'production' })
    expect(deployStatus.status).toBe('healthy')
    expect(deployStatus.environment).toBe('production')

    const scaleRes = await adapter.executeTool('service.scale', { minReplicas: 2, maxReplicas: 8 }, { projectDir: tempDir, environment: 'production' })
    expect(scaleRes.status).toBe('scaled')
    expect(scaleRes.minReplicas).toBe(2)

    const trafficRes = await adapter.executeTool('service.traffic', { canaryPercent: 10 }, { projectDir: tempDir, environment: 'production' })
    expect(trafficRes.status).toBe('traffic_updated')
    expect(trafficRes.canaryPercent).toBe(10)
  })

  it('5. executes telemetry query tools', async () => {
    const metrics = await adapter.executeTool('telemetry.metrics', { timeRange: '1h' }, { projectDir: tempDir, environment: 'production' })
    expect(metrics.requestsTotal).toBeGreaterThan(0)
    expect(metrics.latencies.p95).toBeDefined()

    const logs = await adapter.executeTool('telemetry.logs', { level: 'info' }, { projectDir: tempDir, environment: 'production' })
    expect(logs.entries.length).toBeGreaterThan(0)
  })
})
