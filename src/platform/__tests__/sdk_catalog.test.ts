import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SdkCatalog } from '../sdk/catalog.js'
import { SdkInstaller } from '../sdk/installer.js'
import { PackageManagerDetector } from '../sdk/package-manager.js'
import { McpRegistry } from '../mcp/registry.js'
import { McpAdapter } from '../mcp/adapter.js'
import { McpServerBridge } from '../mcp/server.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

describe('Canonical SDK Catalog & Ecosystem Integration Contracts', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-sdk-cat-test-'))
    await ProjectMetadata.writeManifest(tempDir, {
      schemaVersion: 1,
      name: 'cat-test-app',
      application: 'web',
      database: { engine: 'sqlite' },
      runtimeVersion: '0.19.8',
      capabilities: {},
      sdks: [],
      plugins: [],
    })
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. Package identity: resolves canonical npm packages from short names and aliases', () => {
    expect(SdkCatalog.resolve('web')?.npmPackage).toBe('solarch-web')
    expect(SdkCatalog.resolve('solarch-web')?.npmPackage).toBe('solarch-web')

    expect(SdkCatalog.resolve('mobile')?.npmPackage).toBe('solarch-rn')
    expect(SdkCatalog.resolve('rn')?.npmPackage).toBe('solarch-rn')
    expect(SdkCatalog.resolve('react-native')?.npmPackage).toBe('solarch-rn')
    expect(SdkCatalog.resolve('solarch-rn')?.npmPackage).toBe('solarch-rn')

    expect(SdkCatalog.resolve('electron')?.npmPackage).toBe('solarch-electron')
    expect(SdkCatalog.resolve('solarch-electron')?.npmPackage).toBe('solarch-electron')

    expect(SdkCatalog.resolve('tauri')?.npmPackage).toBe('solarch-tauri')
    expect(SdkCatalog.resolve('solarch-tauri')?.npmPackage).toBe('solarch-tauri')

    expect(SdkCatalog.resolve('ai')?.npmPackage).toBe('solarch-ai')
    expect(SdkCatalog.resolve('solarch-ai')?.npmPackage).toBe('solarch-ai')

    // Legacy fallback mapping
    expect(SdkCatalog.resolve('@solarch/web')?.npmPackage).toBe('solarch-web')
    expect(SdkCatalog.resolve('@solarch/ai')?.npmPackage).toBe('solarch-ai')
    expect(SdkCatalog.resolve('@solarch/react-native')?.npmPackage).toBe('solarch-rn')
  })

  it('2. Installation resolution: installing short name "web" translates to "solarch-web"', async () => {
    const execSpy = vi.spyOn(PackageManagerDetector, 'execute').mockResolvedValue('OK')

    const res = await SdkInstaller.installSdks(tempDir, ['web', 'ai'])

    expect(res.command).toContain('npm install solarch-web solarch-ai')
    const manifest = await ProjectMetadata.readManifest(tempDir)
    expect(manifest?.sdks).toContain('solarch-web')
    expect(manifest?.sdks).toContain('solarch-ai')

    execSpy.mockRestore()
  })

  it('3. Agent separation: CLI operates as tool provider for external agents without solarch-ai', async () => {
    const bridge = new McpServerBridge()
    const res = await bridge.handleToolCall({
      tool: 'project.inspect',
      projectDir: tempDir,
      environment: 'development',
    })

    expect(res.status).toBe('success')
    expect(res.data.exists).toBe(true)
    expect(res.data.manifest.name).toBe('cat-test-app')
  })

  it('4. MCP separation: MCP integration references @solarch/mcp-server without protocol coupling', () => {
    const serverConfig = McpRegistry.getServerConfig()
    expect(serverConfig.packageName).toBe('@solarch/mcp-server')
    expect(serverConfig.capabilities).toContain('project.inspect')

    const tools = McpRegistry.getAllTools()
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.some((t) => t.name === 'database.schema.inspect')).toBe(true)
  })
})
