import { describe, it, expect, vi } from 'vitest'
import { PlatformConfig } from '../config.js'
import { UsersClient } from '../client/users.js'
import { OrganizationsClient } from '../client/organizations.js'
import { ProjectsClient } from '../client/projects.js'

describe('Platform Clients (Phase 2)', () => {
  const config = new PlatformConfig({ apiBaseUrl: 'https://mock.api.solarch.in' })

  it('1. UsersClient retrieves whoami facts', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, init: any) => {
      expect(init?.headers?.Authorization).toBe('Bearer test-token')
      return new Response(
        JSON.stringify({ id: 'usr-1', email: 'u1@solarch.in', tier: 'pro' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const client = new UsersClient(config)
    const res = await client.getWhoami('test-token')
    expect(res.id).toBe('usr-1')
    expect(res.email).toBe('u1@solarch.in')
    expect(res.tier).toBe('pro')

    fetchSpy.mockRestore()
  })

  it('2. OrganizationsClient lists organizations', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          organizations: [
            { id: 'org-1', name: 'Acme Corp', slug: 'acme' },
            { id: 'org-2', name: 'Personal', slug: 'personal' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const client = new OrganizationsClient(config)
    const list = await client.listOrganizations('test-token')
    expect(list.length).toBe(2)
    expect(list[0].id).toBe('org-1')

    fetchSpy.mockRestore()
  })

  it('3. ProjectsClient lists and validates project organization ownership', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/v1/projects/prj-123')) {
        return new Response(
          JSON.stringify({ id: 'prj-123', name: 'My Project', slug: 'my-project', orgId: 'org-1' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('Not Found', { status: 404 })
    })

    const client = new ProjectsClient(config)
    const valid = await client.validateProjectOrg('test-token', 'prj-123', 'org-1')
    expect(valid.id).toBe('prj-123')

    // Mismatched orgId
    await expect(client.validateProjectOrg('test-token', 'prj-123', 'org-2')).rejects.toThrow(
      'belongs to organization "org-1", not "org-2"'
    )

    fetchSpy.mockRestore()
  })
})
