/**
 * Solarch CLI Organizations API Client (Phase 2)
 */

import { PlatformClient } from './platform-client.js'
import { OrganizationInfo } from '../auth/types.js'

export class OrganizationsClient extends PlatformClient {
  public async listOrganizations(token: string): Promise<OrganizationInfo[]> {
    const res = await this.get<{ organizations: OrganizationInfo[] }>('/v1/organizations', {
      token,
    })
    return res.organizations ?? []
  }

  public async getOrganization(token: string, orgId: string): Promise<OrganizationInfo> {
    return this.get<OrganizationInfo>(`/v1/organizations/${encodeURIComponent(orgId)}`, {
      token,
    })
  }
}
