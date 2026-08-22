/**
 * Solarch CLI Ecosystem — Project Intent Contract (Phase 0)
 *
 * Defines the canonical internal representation of what the developer is building.
 * Distinguishes explicit user choices from system recommendations.
 * Strictly forbids embedding secrets, credentials, or API tokens.
 */

export type ApplicationType =
  | 'web'
  | 'api'
  | 'realtime'
  | 'saas'
  | 'ai'
  | 'agent'
  | 'mobile'
  | 'desktop'
  | 'custom'

export type DeploymentModel =
  | 'local'
  | 'cloud'
  | 'local_and_cloud'

export type DesktopRuntime =
  | 'electron'
  | 'tauri'
  | 'unspecified'

export interface UserExplicitChoices {
  application?: ApplicationType
  deployment?: DeploymentModel
  database?: string
  sdks?: string[]
  desktopRuntime?: DesktopRuntime
  plugins?: string[]
  rateLimit?: boolean
  ai?: boolean
}

export interface ProjectIntentInput {
  name?: string
  application?: ApplicationType
  deployment?: DeploymentModel
  desktopRuntime?: DesktopRuntime
  explicitChoices?: UserExplicitChoices
  features?: {
    auth?: string[]
    rateLimit?: boolean
    ai?: boolean
    realtime?: boolean
    storage?: boolean
  }
}

export class ProjectIntent {
  public readonly application: ApplicationType
  public readonly deployment: DeploymentModel
  public readonly desktopRuntime: DesktopRuntime
  public readonly explicitChoices: Readonly<UserExplicitChoices>
  public readonly features: {
    auth: string[]
    rateLimit: boolean
    ai: boolean
    realtime: boolean
    storage: boolean
  }

  constructor(input: ProjectIntentInput = {}) {
    // Assert zero secret leakage in intent initialization
    ProjectIntent.assertNoSecrets(input)

    this.explicitChoices = Object.freeze({ ...(input.explicitChoices || {}) })

    this.application = this.explicitChoices.application ?? input.application ?? 'api'
    this.deployment = this.explicitChoices.deployment ?? input.deployment ?? 'local'
    this.desktopRuntime = this.explicitChoices.desktopRuntime ?? input.desktopRuntime ?? 'unspecified'

    this.features = {
      auth: input.features?.auth ? [...input.features.auth] : ['email'],
      rateLimit: input.features?.rateLimit ?? true,
      ai: input.features?.ai ?? (this.application === 'ai' || this.application === 'agent'),
      realtime: input.features?.realtime ?? (this.application === 'realtime' || this.application === 'saas'),
      storage: input.features?.storage ?? true,
    }
  }

  /**
   * Checks whether a specific property was explicitly provided by the user.
   */
  public isExplicit(field: keyof UserExplicitChoices): boolean {
    return this.explicitChoices[field] !== undefined
  }

  /**
   * Static validator asserting no credential-like fields exist in raw input.
   */
  public static assertNoSecrets(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    const forbiddenKeys = [
      'password',
      'secret',
      'jwt_secret',
      'token',
      'api_key',
      'apikey',
      'connectionstring',
      'dburl',
      'databaseurl',
      'private_key',
    ]

    const check = (item: any) => {
      if (!item || typeof item !== 'object') return
      for (const [k, v] of Object.entries(item)) {
        const lower = k.toLowerCase()
        if (forbiddenKeys.some(fk => lower.includes(fk.toLowerCase()))) {
          throw new Error(`ProjectIntent invariant violation: credentials or secrets are strictly forbidden in intent (found key: "${k}").`)
        }
        if (typeof v === 'object' && v !== null) {
          check(v)
        }
      }
    }

    check(obj)
  }
}
