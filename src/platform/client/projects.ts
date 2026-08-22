/**
 * Solarch CLI Projects API Client (Phase 2)
 */

import { PlatformClient } from './platform-client.js'
import { ProjectInfo } from '../auth/types.js'

export class ProjectsClient extends PlatformClient {
  public async listProjects(token: string, orgId?: string): Promise<ProjectInfo[]> {
    const endpoint = orgId
      ? `/v1/organizations/${encodeURIComponent(orgId)}/projects`
      : '/v1/projects'
    const res = await this.get<{ projects: ProjectInfo[] }>(endpoint, { token })
    return res.projects ?? []
  }

  public async getProject(token: string, projectId: string): Promise<ProjectInfo> {
    return this.get<ProjectInfo>(`/v1/projects/${encodeURIComponent(projectId)}`, { token })
  }

  /**
   * Validates that the specified project belongs to the given organization and is accessible.
   */
  public async validateProjectOrg(
    token: string,
    projectId: string,
    orgId: string
  ): Promise<ProjectInfo> {
    const project = await this.getProject(token, projectId)
    if (project.orgId !== orgId) {
      throw new Error(
        `Project "${projectId}" belongs to organization "${project.orgId}", not "${orgId}".`
      )
    }
    return project
  }
}
