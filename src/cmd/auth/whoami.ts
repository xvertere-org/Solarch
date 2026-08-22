/**
 * Solarch CLI Whoami Command (Phase 2)
 *
 * Implements `solarch whoami [--json]`
 * Displays authenticated user, organization, and project linkage facts.
 * GUARANTEE: Never prints or exposes tokens or secrets.
 */

import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface WhoamiOptions {
  json?: boolean
  token?: string
  dir?: string
  authService?: AuthService
}

export async function runWhoami(options: WhoamiOptions = {}): Promise<void> {
  const authService = options.authService ?? new AuthService()
  const resolved = await authService.resolveSession(options.token)

  // Check local project linkage
  const projectDir = options.dir ? options.dir : process.cwd()
  let linkedProject = null
  try {
    const manifest = await ProjectMetadata.readManifest(projectDir)
    if (manifest?.platform) {
      linkedProject = {
        name: manifest.name,
        projectId: manifest.platform.projectId,
        orgId: manifest.platform.orgId,
        linkedAt: manifest.platform.linkedAt,
      }
    }
  } catch {
    // Local directory might not be a Solarch project
  }

  // 1. JSON Mode
  if (options.json) {
    const jsonOutput = {
      authenticated: resolved.session.isAuthenticated(),
      user: resolved.user
        ? {
            id: resolved.user.id,
            email: resolved.user.email,
            name: resolved.user.name,
            tier: resolved.user.tier,
          }
        : resolved.session.userId
        ? { id: resolved.session.userId }
        : null,
      organization: resolved.session.orgId
        ? { id: resolved.session.orgId }
        : null,
      source: resolved.source,
      expiresAt: resolved.credentials?.expiresAt
        ? new Date(resolved.credentials.expiresAt).toISOString()
        : null,
      linkedProject,
    }

    console.log(JSON.stringify(jsonOutput, null, 2))
    return
  }

  // 2. Text / UI Card Mode
  console.log(colors.bold('\n⚡ Solarch Platform Identity\n'))

  if (!resolved.session.isAuthenticated()) {
    output.warning('Not authenticated with Solarch Platform.')
    console.log(`\n  Run ${colors.cyan('solarch login')} to connect your machine.\n`)
  } else {
    console.log(`  ${colors.bold('Status:')}         ${colors.green('Authenticated')}`)
    if (resolved.user?.email) {
      console.log(`  ${colors.bold('Email:')}          ${resolved.user.email}`)
    }
    if (resolved.user?.id) {
      console.log(`  ${colors.bold('User ID:')}        ${resolved.user.id}`)
    }
    if (resolved.user?.tier) {
      console.log(`  ${colors.bold('Plan:')}           ${resolved.user.tier}`)
    }
    if (resolved.session.orgId) {
      console.log(`  ${colors.bold('Organization:')}   ${resolved.session.orgId}`)
    }
    console.log(`  ${colors.bold('Auth Source:')}    ${resolved.source}`)
    if (resolved.credentials?.expiresAt) {
      console.log(
        `  ${colors.bold('Session Expiry:')} ${new Date(
          resolved.credentials.expiresAt
        ).toLocaleString()}`
      )
    }
    console.log('')
  }

  if (linkedProject) {
    console.log(
      `  ${colors.bold('Linked Project:')}  ${linkedProject.name} (${colors.cyan(
        linkedProject.projectId
      )})`
    )
    console.log(`  ${colors.bold('Project Org:')}     ${linkedProject.orgId}\n`)
  } else {
    console.log(`  ${colors.bold('Project Link:')}    ${colors.dim('Not linked to a remote Solarch project')}\n`)
  }
}
