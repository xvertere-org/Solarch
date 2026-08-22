import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { McpServerBridge } from '../mcp/server.js'
import { McpAuditLogger } from '../mcp/audit.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('MCP Risk Classification, Approval Gate & Audit Logger (Phase 10)', () => {
  let tempDir: string
  let bridge: McpServerBridge

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-mcp-perm-test-'))
    bridge = new McpServerBridge()

    await ProjectMetadata.writeManifest(tempDir, {
      schemaVersion: 1,
      name: 'perm-test-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: ['solarch-web'],
      plugins: [],
    })
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. allows read operations without human approval', async () => {
    const res = await bridge.handleToolCall({
      tool: 'project.inspect',
      projectDir: tempDir,
      environment: 'production',
      callerId: 'claude-code',
    })

    expect(res.status).toBe('success')
    expect(res.data.exists).toBe(true)
  })

  it('2. returns approval challenge when external agent calls high-risk tool without approval', async () => {
    const res = await bridge.handleToolCall({
      tool: 'deployment.deploy',
      parameters: { tag: 'v1.0.0' },
      projectDir: tempDir,
      environment: 'production',
      callerId: 'cursor-agent',
      approved: false,
    })

    expect(res.status).toBe('approval_required')
    expect(res.approval).toBeDefined()
    expect(res.approval?.risk).toBe('production_mutation')
    expect(res.approval?.environment).toBe('production')
    expect(res.approval?.impact).toContain('Deploy project release')
  })

  it('3. executes high-risk tool when approved flag is set to true', async () => {
    const res = await bridge.handleToolCall({
      tool: 'deployment.deploy',
      parameters: { tag: 'v1.0.0' },
      projectDir: tempDir,
      environment: 'production',
      callerId: 'cursor-agent',
      approved: true,
    })

    expect(res.status).toBe('success')
    expect(res.data.status).toBe('deployed')
    expect(res.data.tag).toBe('v1.0.0')
  })

  it('4. logs every tool call to append-only audit file with pre-persistence redaction', async () => {
    // Call read tool
    await bridge.handleToolCall({
      tool: 'project.inspect',
      projectDir: tempDir,
      environment: 'development',
      callerId: 'claude-code',
    })

    // Call high-risk tool with sensitive parameters
    await bridge.handleToolCall({
      tool: 'service.scale',
      parameters: { minReplicas: 3, maxReplicas: 10, apiKey: 'sk-secret-123' },
      projectDir: tempDir,
      environment: 'production',
      callerId: 'claude-code',
      approved: false,
    })

    const entries = await McpAuditLogger.readEntries(tempDir)
    expect(entries.length).toBe(2)

    const scaleEntry = entries.find((e) => e.tool === 'service.scale')
    expect(scaleEntry).toBeDefined()
    expect(scaleEntry?.status).toBe('approval_required')
    expect(scaleEntry?.risk).toBe('production_mutation')

    // Verify secret redaction in audit log
    expect(scaleEntry?.parameters.apiKey).toBe('[REDACTED]')
    expect(scaleEntry?.parameters.minReplicas).toBe(3)
  })
})
