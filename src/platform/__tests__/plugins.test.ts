import { describe, it, expect, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PluginRegistry } from '../plugins/registry.js'
import { PluginResolver } from '../plugins/resolver.js'
import { PluginValidator } from '../plugins/validator.js'
import { PluginConfigManager } from '../plugins/config.js'
import { PluginLoader } from '../plugins/loader.js'
import { PluginScaffolder } from '../plugins/scaffolder.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

describe('Plugin Ecosystem, Lifecycle Orchestration & Isolation (Phase 5 & 5.1)', () => {
  const baseManifest: ProjectManifest = {
    schemaVersion: 1,
    name: 'test-plugin-app',
    application: 'web',
    runtimeVersion: '0.19.8',
    database: {
      engine: 'sqlite',
      topology: 'standalone',
      capabilities: {},
      source: 'intent',
    },
    sdks: ['@solarch/core-client'],
    plugins: {
      mode: 'opt-in',
      list: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('1. PluginRegistry resolves official plugins and normalizes IDs', () => {
    const oauthDesc = PluginRegistry.get('auth-oauth')
    expect(oauthDesc).toBeDefined()
    expect(oauthDesc?.id).toBe('@solarch/plugin-auth-oauth')
    expect(oauthDesc?.source).toBe('official')

    expect(PluginRegistry.normalizeId('storage-s3')).toBe('@solarch/plugin-storage-s3')
    expect(PluginRegistry.normalizeId('@scope/custom-plugin')).toBe('@scope/custom-plugin')
    expect(PluginRegistry.normalizeId('local:custom-auth')).toBe('local:custom-auth')
  })

  it('2. PluginResolver resolves dependencies and required SDKs', () => {
    const bundle = PluginResolver.resolve(['@solarch/plugin-search-pgvector'])

    expect(bundle.descriptors.length).toBe(1)
    expect(bundle.requiredSdks).toContain('solarch-ai')
  })

  it('3. PluginValidator enforces capability requirements', () => {
    const pgvector = PluginRegistry.get('search-pgvector')!

    // SQLite manifest should fail validation for pgvector
    const result = PluginValidator.validate(pgvector, baseManifest)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('postgres')

    // PostgreSQL manifest should pass
    const pgManifest: ProjectManifest = {
      ...baseManifest,
      database: {
        ...baseManifest.database,
        engine: 'postgres',
      },
    }
    const validResult = PluginValidator.validate(pgvector, pgManifest)
    expect(validResult.valid).toBe(true)
  })

  it('4. PluginConfigManager extracts environment requirements without raw secrets', () => {
    const s3 = PluginRegistry.get('storage-s3')!
    const envReqs = PluginConfigManager.getRequiredEnvList([s3])

    const accessKeyReq = envReqs.find((r) => r.key === 'AWS_ACCESS_KEY_ID')
    expect(accessKeyReq).toBeDefined()
    expect(accessKeyReq?.secret).toBe(true)

    const scaffoldedConfig = PluginConfigManager.getScaffoldedConfig(s3)
    expect(scaffoldedConfig.region).toBe('ap-south-1')
    expect(scaffoldedConfig.bucket).toBe('app-assets')
  })

  it('5. PluginLoader isolates exceptions: broken plugin does not crash runtime or block healthy plugins', async () => {
    const loader = new PluginLoader({
      projectDir: '/tmp',
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    })

    const healthyExecution = vi.fn()
    const brokenExecution = vi.fn().mockImplementation(() => {
      throw new Error('Fatal plugin unhandled crash')
    })

    loader.register(
      {
        id: '@solarch/plugin-broken',
        name: 'broken',
        title: 'Broken Plugin',
        description: 'Faulty',
        category: 'utilities',
        source: 'community',
        publisher: 'Test',
        environmentRequirements: [],
        hooks: ['onInit', 'onRequest'],
      },
      {
        onInit: brokenExecution,
        onRequest: brokenExecution,
      }
    )

    loader.register(
      {
        id: '@solarch/plugin-healthy',
        name: 'healthy',
        title: 'Healthy Plugin',
        description: 'Stable',
        category: 'utilities',
        source: 'official',
        publisher: 'Solarch',
        environmentRequirements: [],
        hooks: ['onInit', 'onRequest'],
      },
      {
        onInit: healthyExecution,
        onRequest: healthyExecution,
      }
    )

    // Initializing all plugins should catch the broken plugin's error without throwing
    await expect(loader.initializeAll()).resolves.not.toThrow()
    expect(healthyExecution).toHaveBeenCalled()

    const loaded = loader.getLoadedPlugins()
    expect(loaded[0].state).toBe('error')
    expect(loaded[0].error).toContain('Fatal plugin unhandled crash')
    expect(loaded[1].state).toBe('initialized')

    // Dispatching requests should skip broken plugin and run healthy plugin
    await expect(
      loader.dispatchRequest({ method: 'GET', path: '/api/test', headers: {} })
    ).resolves.not.toThrow()
    expect(healthyExecution).toHaveBeenCalledTimes(2)
  })

  it('6. PluginLoader enforces timeout boundaries for hanging hooks', async () => {
    const loader = new PluginLoader({
      projectDir: '/tmp',
      timeoutMs: 50, // 50ms timeout for test
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    })

    loader.register(
      {
        id: '@solarch/plugin-hanging',
        name: 'hanging',
        title: 'Hanging Plugin',
        description: 'Locks event loop',
        category: 'utilities',
        source: 'community',
        publisher: 'Test',
        environmentRequirements: [],
        hooks: ['onRequest'],
      },
      {
        onRequest: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500))
        },
      }
    )

    await loader.dispatchRequest({ method: 'POST', path: '/api/hang', headers: {} })

    const loaded = loader.getLoadedPlugins()
    expect(loaded[0].state).toBe('error')
    expect(loaded[0].error).toContain('timed out')
  })

  it('7. PluginLoader respects dependency ordering and reverse shutdown', async () => {
    const loader = new PluginLoader({ projectDir: '/tmp' })
    const initOrder: string[] = []
    const shutdownOrder: string[] = []

    const descA = {
      id: '@solarch/plugin-dep-a',
      name: 'dep-a',
      title: 'A',
      description: 'A',
      category: 'utilities' as const,
      source: 'official' as const,
      publisher: 'Solarch',
      environmentRequirements: [],
      hooks: ['onInit', 'onShutdown'] as const,
    }

    const descB = {
      id: '@solarch/plugin-dep-b',
      name: 'dep-b',
      title: 'B',
      description: 'B depends on A',
      category: 'utilities' as const,
      source: 'official' as const,
      publisher: 'Solarch',
      requiresPlugins: ['@solarch/plugin-dep-a'],
      environmentRequirements: [],
      hooks: ['onInit', 'onShutdown'] as const,
    }

    // Register B first, but A is a requirement of B
    loader.register(descB, {
      onInit: () => {
        initOrder.push('B')
      },
      onShutdown: () => {
        shutdownOrder.push('B')
      },
    })

    loader.register(descA, {
      onInit: () => {
        initOrder.push('A')
      },
      onShutdown: () => {
        shutdownOrder.push('A')
      },
    })

    await loader.initializeAll()
    expect(initOrder).toEqual(['A', 'B'])

    await loader.shutdownAll()
    expect(shutdownOrder).toEqual(['A', 'B']) // reversed from registration list
  })

  it('8. PluginScaffolder generates custom plugin template in src/plugins/', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-scaffold-test-'))

    const filePath = await PluginScaffolder.scaffoldCustomPlugin(tempDir, 'my-telemetry')
    expect(fs.existsSync(filePath)).toBe(true)

    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toContain('Solarch Custom Plugin: my-telemetry')
    expect(content).toContain('onInit')
    expect(content).toContain('onRequest')

    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})
