/**
 * Solarch CLI Ecosystem — Platform Session Contract (Phase 0)
 *
 * Defines the contract for Solarch account/platform state.
 *
 * INVARIANT: Kept isolated from ProjectPlan.
 * Authentication tokens (JWTs, refresh tokens) are strictly forbidden in this contract.
 */

export type AccountStatus = 'unauthenticated' | 'pending' | 'authenticated'

export interface PlatformSessionInput {
  status?: AccountStatus
  userId?: string
  orgId?: string
  projectId?: string
}

export class PlatformSession {
  public readonly status: AccountStatus
  public readonly userId?: string
  public readonly orgId?: string
  public readonly projectId?: string

  constructor(input: PlatformSessionInput = {}) {
    PlatformSession.assertNoTokens(input)

    this.status = input.status ?? 'unauthenticated'
    this.userId = input.userId
    this.orgId = input.orgId
    this.projectId = input.projectId
  }

  public isAuthenticated(): boolean {
    return this.status === 'authenticated'
  }

  public isPending(): boolean {
    return this.status === 'pending'
  }

  public toJSON() {
    return {
      status: this.status,
      userId: this.userId,
      orgId: this.orgId,
      projectId: this.projectId,
    }
  }

  /**
   * Static invariant check ensuring no token or credential fields are present.
   */
  public static assertNoTokens(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return
    const forbiddenKeys = [
      'token',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
      'jwt',
      'bearer',
      'password',
      'secret',
    ]

    const check = (item: any) => {
      if (!item || typeof item !== 'object') return
      for (const [k, v] of Object.entries(item)) {
        const lower = k.toLowerCase()
        if (forbiddenKeys.some(fk => lower === fk || lower.includes('token') || lower.includes('secret'))) {
          throw new Error(`PlatformSession invariant violation: access tokens or credentials cannot be embedded into session contract (found key: "${k}").`)
        }
        if (typeof v === 'object' && v !== null) {
          check(v)
        }
      }
    }

    check(obj)
  }
}
