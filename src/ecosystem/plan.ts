/**
 * Solarch CLI Ecosystem — Project Plan Contract (Phase 0)
 *
 * Central planning object that combines all project initialization decisions:
 * - Project identity
 * - Application intent
 * - Database strategy
 * - SDK selection
 * - Desktop runtime
 * - Plugin selection
 * - Generation requirements
 *
 * INVARIANT: Strictly secret-free. Does NOT contain account tokens or database passwords.
 */

import { ProjectIntent, DesktopRuntime } from './intent'
import { DatabaseStrategy } from './database'
import { SdkSelection } from './selection'
import { PluginSelection } from './plugin'

export interface ProjectIdentity {
  name: string
  dir: string
}

export interface GenerationRequirements {
  templateBaseline?: string
  migrations: string[]
  hooks: string[]
  envKeys: string[]
  dockerCompose?: boolean
}

export interface ProjectPlanInput {
  identity: ProjectIdentity
  intent: ProjectIntent
  database: DatabaseStrategy
  sdks: SdkSelection
  plugins?: PluginSelection
  desktop?: {
    runtime: DesktopRuntime
  }
  generation?: Partial<GenerationRequirements>
}

export class ProjectPlan {
  public readonly identity: Readonly<ProjectIdentity>
  public readonly intent: ProjectIntent
  public readonly database: DatabaseStrategy
  public readonly sdks: SdkSelection
  public readonly plugins: PluginSelection
  public readonly desktop: {
    runtime: DesktopRuntime
  }
  public readonly generation: Readonly<GenerationRequirements>
  public readonly createdAt: string

  constructor(input: ProjectPlanInput) {
    ProjectPlan.assertNoSecrets(input)

    if (!input.identity?.name || input.identity.name.trim() === '') {
      throw new Error('ProjectPlan validation failed: identity.name is required.')
    }
    if (!input.identity?.dir || input.identity.dir.trim() === '') {
      throw new Error('ProjectPlan validation failed: identity.dir is required.')
    }

    this.identity = Object.freeze({
      name: input.identity.name.trim(),
      dir: input.identity.dir.trim(),
    })
    this.intent = input.intent
    this.database = input.database
    this.sdks = input.sdks
    this.plugins = input.plugins ?? new PluginSelection()
    this.desktop = Object.freeze({
      runtime: input.desktop?.runtime ?? input.intent.desktopRuntime ?? 'unspecified',
    })

    this.generation = Object.freeze({
      templateBaseline: input.generation?.templateBaseline ?? input.intent.application,
      migrations: input.generation?.migrations ? [...input.generation.migrations] : [],
      hooks: input.generation?.hooks ? [...input.generation.hooks] : [],
      envKeys: input.generation?.envKeys ? [...input.generation.envKeys] : ['JWT_SECRET', 'SOLARCH_JWT_SECRET', 'SOLARCH_ENCRYPTION_KEY'],
      dockerCompose: input.generation?.dockerCompose ?? (this.database.engine === 'postgres'),
    })

    this.createdAt = new Date().toISOString()
  }

  /**
   * Validates integrity and consistency of the plan.
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.identity.name || this.identity.name.length === 0) {
      errors.push('Project name must not be empty')
    }

    if (this.intent.application === 'desktop' && this.desktop.runtime === 'unspecified') {
      errors.push('Desktop application requires an explicit desktop runtime (electron or tauri)')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  public toJSON() {
    return {
      identity: { ...this.identity },
      intent: {
        application: this.intent.application,
        deployment: this.intent.deployment,
        desktopRuntime: this.intent.desktopRuntime,
        features: this.intent.features,
        explicitChoices: this.intent.explicitChoices,
      },
      database: this.database.toJSON(),
      sdks: this.sdks.toJSON(),
      plugins: this.plugins.toJSON(),
      desktop: { ...this.desktop },
      generation: { ...this.generation },
      createdAt: this.createdAt,
    }
  }

  /**
   * Static invariant check ensuring no credential fields are present in any sub-object.
   */
  public static assertNoSecrets(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    const forbiddenKeys = [
      'password',
      'jwt_secret',
      'token',
      'api_key',
      'apikey',
      'connectionstring',
      'dburl',
      'databaseurl',
      'private_key',
      'access_token',
      'refresh_token',
    ]

    const check = (item: any) => {
      if (!item || typeof item !== 'object') return
      for (const [k, v] of Object.entries(item)) {
        const lower = k.toLowerCase()
        const isAllowedMetadataKey = k === 'secretRefs' || k === 'secretNames' || k === 'secretReferences'
        if (!isAllowedMetadataKey && (forbiddenKeys.some(fk => lower.includes(fk.toLowerCase())) || lower.includes('secret') || lower.includes('password') || lower.includes('token'))) {
          throw new Error(`ProjectPlan invariant violation: secrets or credentials cannot be embedded into ProjectPlan (found key: "${k}").`)
        }
        if (typeof v === 'object' && v !== null) {
          check(v)
        }
      }
    }

    check(obj)
  }
}
