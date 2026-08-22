/**
 * Solarch CLI Link Command (Phase 2)
 *
 * Implements `solarch link [--project <id>] [--org <id>] [--yes]`
 * Links local project (.solarch/project.json) to a remote platform project with strict validation.
 */

import { select, confirm as clackConfirm, isCancel, cancel, spinner as createSpinner } from '@clack/prompts'
import { AuthService } from '../../platform/auth/auth-service.js'
import { OrganizationsClient } from '../../platform/client/organizations.js'
import { ProjectsClient } from '../../platform/client/projects.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface LinkOptions {
  project?: string
  org?: string
  yes?: boolean
  dir?: string
  token?: string
  authService?: AuthService
}

export async function runLink(options: LinkOptions = {}): Promise<void> {
  const authService = options.authService ?? new AuthService()
  const projectDir = options.dir ? options.dir : process.cwd()

  // 1. Validate manifest exists locally
  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found in current directory. Run "solarch init" first.')
    throw new Error('Missing .solarch/project.json')
  }

  // 2. Resolve authentication
  const resolved = await authService.resolveSession(options.token)
  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('You must be logged in to link a project. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const token = resolved.credentials.accessToken
  const config = authService.getConfig()
  const orgsClient = new OrganizationsClient(config)
  const projectsClient = new ProjectsClient(config)

  const s = createSpinner()
  s.start('Fetching accessible organizations...')

  const orgs = await orgsClient.listOrganizations(token)
  s.stop('Organizations loaded.')

  if (!orgs || orgs.length === 0) {
    output.failure('No accessible organizations found for your account.')
    throw new Error('No organizations found')
  }

  // 3. Select / validate organization
  let selectedOrgId = options.org
  if (selectedOrgId) {
    const foundOrg = orgs.find((o) => o.id === selectedOrgId || o.slug === selectedOrgId)
    if (!foundOrg) {
      output.failure(`Organization "${selectedOrgId}" was not found or is inaccessible.`)
      throw new Error(`Organization ${selectedOrgId} not found`)
    }
    selectedOrgId = foundOrg.id
  } else {
    if (orgs.length === 1 && options.yes) {
      selectedOrgId = orgs[0].id
    } else {
      const orgChoice = await select({
        message: 'Select an organization:',
        options: orgs.map((o) => ({
          value: o.id,
          label: o.name,
          hint: o.slug,
        })),
      })
      if (isCancel(orgChoice)) {
        cancel('Link cancelled.')
        return
      }
      selectedOrgId = orgChoice as string
    }
  }

  // 4. Select / validate project
  s.start('Fetching remote projects...')
  const projects = await projectsClient.listProjects(token, selectedOrgId)
  s.stop('Projects loaded.')

  let selectedProjectId = options.project
  if (selectedProjectId) {
    // Validate project ownership and org membership
    s.start(`Validating project "${selectedProjectId}"...`)
    await projectsClient.validateProjectOrg(token, selectedProjectId, selectedOrgId)
    s.stop('Project validated.')
  } else {
    if (!projects || projects.length === 0) {
      output.failure(`No projects found in organization "${selectedOrgId}".`)
      throw new Error('No projects found in organization')
    }

    const projectChoice = await select({
      message: 'Select a platform project to link:',
      options: projects.map((proj) => ({
        value: proj.id,
        label: proj.name,
        hint: proj.slug,
      })),
    })
    if (isCancel(projectChoice)) {
      cancel('Link cancelled.')
      return
    }
    selectedProjectId = projectChoice as string
  }

  // 5. Confirm linking
  if (!options.yes) {
    const confirmed = await clackConfirm({
      message: `Link local project "${manifest.name}" to remote project "${selectedProjectId}"?`,
      initialValue: true,
    })
    if (isCancel(confirmed) || !confirmed) {
      cancel('Link cancelled.')
      return
    }
  }

  // 6. Atomically patch manifest
  await ProjectMetadata.linkProject(projectDir, {
    projectId: selectedProjectId,
    orgId: selectedOrgId,
  })

  output.success(
    `Successfully linked ${colors.bold(manifest.name)} to remote project ${colors.cyan(
      selectedProjectId
    )} (Org: ${colors.cyan(selectedOrgId)})`
  )
}
