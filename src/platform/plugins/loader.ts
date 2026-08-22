/**
 * Solarch Platform Plugin Lifecycle Orchestrator & Loader (Phase 5.1)
 *
 * Implements strict exception isolation, timeout boundaries, dependency ordering,
 * and lifecycle hook execution for Solarch plugins.
 */

import {
  PluginDescriptor,
  PluginHooks,
  LoadedPlugin,
  PluginLoaderOptions,
  PluginInitContext,
  PluginRequestContext,
  PluginAuthContext,
  PluginMigrationContext,
} from './types.js'
import { PluginRegistry } from './registry.js'

export class PluginLoader {
  private options: PluginLoaderOptions
  private loadedPlugins: LoadedPlugin[] = []

  constructor(options: PluginLoaderOptions) {
    this.options = {
      timeoutMs: 5000,
      environment: 'development',
      ...options,
    }
  }

  /**
   * Sorts plugins topologically based on requiresPlugins dependencies.
   */
  public static sortDependencyOrder(descriptors: PluginDescriptor[]): PluginDescriptor[] {
    const sorted: PluginDescriptor[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const descMap = new Map<string, PluginDescriptor>()

    for (const d of descriptors) {
      descMap.set(d.id, d)
      descMap.set(d.name, d)
    }

    function visit(desc: PluginDescriptor) {
      if (visited.has(desc.id)) return
      if (visiting.has(desc.id)) {
        // Cyclic dependency detected, break cycle gracefully
        visited.add(desc.id)
        sorted.push(desc)
        return
      }

      visiting.add(desc.id)

      if (desc.requiresPlugins) {
        for (const req of desc.requiresPlugins) {
          const canonicalReq = PluginRegistry.normalizeId(req)
          const dep = descMap.get(canonicalReq) || descMap.get(req)
          if (dep) {
            visit(dep)
          }
        }
      }

      visiting.delete(desc.id)
      visited.add(desc.id)
      sorted.push(desc)
    }

    for (const d of descriptors) {
      visit(d)
    }

    return sorted
  }

  /**
   * Registers and wraps a plugin with lifecycle hooks.
   */
  public register(descriptor: PluginDescriptor, hooks: PluginHooks): void {
    this.loadedPlugins.push({
      descriptor,
      hooks,
      state: 'initialized',
    })
  }

  /**
   * Returns all currently loaded plugins.
   */
  public getLoadedPlugins(): LoadedPlugin[] {
    return [...this.loadedPlugins]
  }

  /**
   * Executes a hook with timeout and exception isolation.
   */
  private async executeIsolated(
    plugin: LoadedPlugin,
    hookName: string,
    fn: () => Promise<void> | void
  ): Promise<boolean> {
    const timeoutMs = this.options.timeoutMs || 5000

    try {
      await Promise.race([
        Promise.resolve(fn()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Plugin hook ${hookName} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ])
      return true
    } catch (err: any) {
      plugin.state = 'error'
      plugin.error = err?.message || String(err)
      if (this.options.logger) {
        this.options.logger.error(
          `[Plugin Error] Plugin "${plugin.descriptor.id}" failed in hook "${hookName}": ${plugin.error}`,
          err
        )
      }
      return false
    }
  }

  /**
   * Executes onInit lifecycle hook for all registered plugins in dependency order.
   */
  public async initializeAll(): Promise<void> {
    const sortedDescriptors = PluginLoader.sortDependencyOrder(
      this.loadedPlugins.map((p) => p.descriptor)
    )

    const pluginMap = new Map<string, LoadedPlugin>()
    for (const lp of this.loadedPlugins) {
      pluginMap.set(lp.descriptor.id, lp)
    }

    for (const desc of sortedDescriptors) {
      const plugin = pluginMap.get(desc.id)
      if (!plugin || !plugin.hooks.onInit) continue

      const ctx: PluginInitContext = {
        projectDir: this.options.projectDir,
        environment: this.options.environment || 'development',
        config: desc.defaultConfig || {},
      }

      await this.executeIsolated(plugin, 'onInit', () => plugin.hooks.onInit!(ctx))
    }
  }

  /**
   * Dispatches onRequest lifecycle hook to all active plugins.
   */
  public async dispatchRequest(ctx: PluginRequestContext): Promise<void> {
    for (const plugin of this.loadedPlugins) {
      if (plugin.state === 'error' || !plugin.hooks.onRequest) continue
      await this.executeIsolated(plugin, 'onRequest', () => plugin.hooks.onRequest!(ctx))
    }
  }

  /**
   * Dispatches onAuth lifecycle hook to all active plugins.
   */
  public async dispatchAuth(ctx: PluginAuthContext): Promise<void> {
    for (const plugin of this.loadedPlugins) {
      if (plugin.state === 'error' || !plugin.hooks.onAuth) continue
      await this.executeIsolated(plugin, 'onAuth', () => plugin.hooks.onAuth!(ctx))
    }
  }

  /**
   * Dispatches onMigration lifecycle hook to all active plugins.
   */
  public async dispatchMigration(ctx: PluginMigrationContext): Promise<void> {
    for (const plugin of this.loadedPlugins) {
      if (plugin.state === 'error' || !plugin.hooks.onMigration) continue
      await this.executeIsolated(plugin, 'onMigration', () => plugin.hooks.onMigration!(ctx))
    }
  }

  /**
   * Shuts down all plugins in reverse dependency order.
   */
  public async shutdownAll(): Promise<void> {
    const reverseList = [...this.loadedPlugins].reverse()

    for (const plugin of reverseList) {
      if (plugin.hooks.onShutdown) {
        await this.executeIsolated(plugin, 'onShutdown', () => plugin.hooks.onShutdown!())
      }
      plugin.state = 'stopped'
    }
  }
}
