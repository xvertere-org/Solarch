/**
 * Solarch CLI Platform Configuration (Phase 2)
 *
 * Central abstraction for Platform API, Dashboard URLs, and timeouts.
 * Allows staging/local override via environment variables.
 */

export interface PlatformConfigOptions {
  apiBaseUrl?: string
  dashboardBaseUrl?: string
  authBaseUrl?: string
  timeoutMs?: number
}

export class PlatformConfig {
  public readonly apiBaseUrl: string
  public readonly dashboardBaseUrl: string
  public readonly authBaseUrl: string
  public readonly timeoutMs: number

  constructor(options: PlatformConfigOptions = {}) {
    this.apiBaseUrl =
      options.apiBaseUrl ||
      process.env.SOLARCH_API_URL ||
      'https://api.solarch.in'

    this.dashboardBaseUrl =
      options.dashboardBaseUrl ||
      process.env.SOLARCH_DASHBOARD_URL ||
      'https://app.solarch.in'

    this.authBaseUrl =
      options.authBaseUrl ||
      process.env.SOLARCH_AUTH_URL ||
      `${this.dashboardBaseUrl}/cli/auth`

    this.timeoutMs =
      options.timeoutMs ??
      (process.env.SOLARCH_TIMEOUT_MS
        ? parseInt(process.env.SOLARCH_TIMEOUT_MS, 10)
        : 10000)
  }

  public static default(): PlatformConfig {
    return new PlatformConfig()
  }
}
