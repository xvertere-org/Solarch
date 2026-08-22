/**
 * Solarch CLI Users API Client (Phase 2)
 */

import { PlatformClient } from './platform-client.js'
import { UserInfo } from '../auth/types.js'

export class UsersClient extends PlatformClient {
  public async getWhoami(token: string): Promise<UserInfo> {
    return this.get<UserInfo>('/v1/user/whoami', { token })
  }

  public async validateToken(token: string): Promise<UserInfo> {
    return this.getWhoami(token)
  }
}
