/**
 * Solarch CLI Deploy Command (Phase 7)
 *
 * Implements `solarch deploy [--env <env>] [--provider <provider>] [--dry-run] [--allow-dirty] [--json]`
 */

import { spinner as createSpinner } from '@clack/prompts'
import { PlatformConfig } from '../../platform/config.js'
import { PlatformClient } from '../../platform/client/platform-client.js'
import { DeploymentClient } from '../../platform/deployment/client.js'
import { DeploymentPackager } from '../../platform/deployment/packager.js'
import { DeploymentOrchestrator } from '../../platform/deployment/orchestrator.js'
import { AuthService } from '../../platform/auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface DeployCommandOptions {
  env?: string
  provider?: string
  dryRun?: boolean
  allowDirty?: boolean
  json?: boolean
  dir?: string
  token?: string
  entrypoint?: string
  buildCommand?: string
}

export async function runDeploy(options: DeployCommandOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()
  const environment = options.env || 'development'
  const manifest = await ProjectMetadata.readManifest(projectDir)

  if (!manifest || !manifest.platform) {
    output.failure('Project is not linked to Solarch Platform. Run "solarch link" first.')
    throw new Error('Project not linked')
  }

  // 1. Build deterministic bundle and scan for secret leaks
  const bundle = await DeploymentPackager.createBundle(projectDir, manifest, {
    environment,
    entrypoint: options.entrypoint,
    buildCommand: options.buildCommand,
  })

  if (options.dryRun) {
    if (options.json) {
      console.log(JSON.stringify({ dryRun: true, bundle }, null, 2))
      return
    }
    console.log(colors.bold(`\n⚡ Solarch Deployment Preview (Dry Run) [${environment}]\n`))
    console.log(`  • Bundle Hash:     ${colors.cyan(bundle.bundleHash)}`)
    console.log(`  • Files Included:  ${bundle.fileCount}`)
    console.log(`  • Total Size:      ${(bundle.totalBytes / 1024).toFixed(1)} KB`)
    console.log(`  • Health Endpoint: ${bundle.spec.healthCheck.path}`)
    console.log(`  • Zero Secret Leaks: ✔ Verified`)
    console.log(colors.yellow(`\nNo remote infrastructure or deployment state modified.\n`))
    return
  }

  const config = PlatformConfig.default()
  const authService = new AuthService(config)
  const resolved = await authService.resolveSession(options.token)

  if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
    output.failure('Authentication required. Run "solarch login" first.')
    throw new Error('Unauthenticated')
  }

  const s = createSpinner()
  s.start(`Packaging and submitting deployment to [${environment}]...`)

  try {
    const rawClient = new PlatformClient(config)
    const deployClient = new DeploymentClient(rawClient)
    const orchestrator = new DeploymentOrchestrator(deployClient, {
      onStatusChange: (status) => {
        s.message(`Deployment state: ${status}...`)
      },
    })

    const record = await orchestrator.deployAndAwait(bundle.spec, resolved.credentials.accessToken)

    s.stop(`Deployment complete.`)

    if (options.json) {
      console.log(JSON.stringify(record, null, 2))
      return
    }

    console.log(colors.bold(`\n⚡ Solarch Deployment Succeeded [${environment}]\n`))
    console.log(`  • Deployment ID: ${colors.cyan(record.deploymentId)}`)
    console.log(`  • Status:        ${colors.green('active')}`)
    console.log(`  • Bundle Hash:   ${record.bundleHash}`)
    if (record.deploymentUrl) {
      console.log(`  • Live URL:      ${colors.bold(colors.cyan(record.deploymentUrl))}`)
    }
    console.log('')
  } catch (err: any) {
    s.stop('Deployment failed.')
    output.failure(`Deployment error: ${err?.message || err}`)
    throw err
  }
}
