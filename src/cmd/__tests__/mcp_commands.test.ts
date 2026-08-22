import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runMcpTools } from '../mcp/tools.js'
import { runMcpInspect } from '../mcp/inspect.js'
import { runMcpPermissions } from '../mcp/permissions.js'
import { runMcpAudit } from '../mcp/audit.js'
import { McpAuditLogger } from '../../platform/mcp/audit.js'

describe('MCP CLI Commands (Phase 10)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-mcp-cmd-test-'))
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. solarch mcp tools outputs tool catalog', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runMcpTools({ json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.some((t: any) => t.name === 'project.inspect')).toBe(true)

    logSpy.mockRestore()
  })

  it('2. solarch mcp inspect <toolName> returns tool details', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runMcpInspect({ toolName: 'database.migration.apply', json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.name).toBe('database.migration.apply')
    expect(parsed.risk).toBe('destructive')
    expect(parsed.approvalRequired).toBe(true)

    logSpy.mockRestore()
  })

  it('3. solarch mcp permissions displays risk governance policy', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runMcpPermissions({ json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.policyVersion).toBe('1.0.0')
    expect(parsed.riskTiers.production_mutation.approvalRequired).toBe(true)

    logSpy.mockRestore()
  })

  it('4. solarch mcp audit displays logged external agent calls', async () => {
    await McpAuditLogger.log(tempDir, {
      tool: 'deployment.status',
      risk: 'read',
      environment: 'production',
      caller: 'claude-code',
      status: 'executed',
      durationMs: 12,
      parameters: { deploymentId: 'dep_1' },
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runMcpAudit({ dir: tempDir, json: true })

    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(logSpy.mock.calls[0][0])
    expect(parsed.length).toBe(1)
    expect(parsed[0].tool).toBe('deployment.status')

    logSpy.mockRestore()
  })
})
