/**
 * Solarch Platform Plugin Scaffolder (Phase 5.1)
 *
 * Generates custom plugin templates with typed lifecycle hooks.
 */

import * as fs from 'fs'
import * as path from 'path'

export class PluginScaffolder {
  public static async scaffoldCustomPlugin(projectDir: string, pluginName: string): Promise<string> {
    const pluginsDir = path.join(projectDir, 'src', 'plugins')
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true })
    }

    const sanitizedName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '')
    const targetFile = path.join(pluginsDir, `${sanitizedName}.ts`)

    if (fs.existsSync(targetFile)) {
      throw new Error(`Plugin file "${targetFile}" already exists.`)
    }

    const content = `/**
 * Solarch Custom Plugin: ${sanitizedName}
 */

import type {
  PluginInitContext,
  PluginRequestContext,
  PluginAuthContext,
  PluginMigrationContext,
  PluginHooks,
} from 'solarch'

export default function createPlugin(options: Record<string, any> = {}): PluginHooks {
  return {
    async onInit(ctx: PluginInitContext) {
      // Plugin initialization logic
    },

    async onRequest(ctx: PluginRequestContext) {
      // Request lifecycle hook
    },

    async onAuth(ctx: PluginAuthContext) {
      // Authentication lifecycle hook
    },

    async onMigration(ctx: PluginMigrationContext) {
      // Migration lifecycle hook
    },

    async onShutdown() {
      // Cleanup resources on server shutdown
    },
  }
}
`

    await fs.promises.writeFile(targetFile, content, 'utf-8')
    return targetFile
  }
}
