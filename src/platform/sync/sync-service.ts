/**
 * Solarch CLI Project Configuration Synchronization Service (Phase 3)
 *
 * Implements Dashboard -> CLI configuration pull, .env merge, and manifest update.
 * Strictly separates configuration sync from dependency package installation.
 */

import * as fs from 'fs'
import * as path from 'path'
import { PlatformConfig } from '../config.js'
import { PlatformClient } from '../client/platform-client.js'
import { AuthService } from '../auth/auth-service.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { EnvMerger } from './env-merger.js'
import { SdkInstaller } from '../sdk/installer.js'
import { ProjectConfigPayload, SyncOptions, SyncResult } from './types.js'

export class SyncService {
  private config: PlatformConfig
  private platformClient: PlatformClient
  private authService: AuthService

  constructor(
    config: PlatformConfig = PlatformConfig.default(),
    authService: AuthService = new AuthService(config)
  ) {
    this.config = config
    this.authService = authService
    this.platformClient = new PlatformClient(config)
  }

  /**
   * Fetches remote project configuration from the Solarch Platform API.
   */
  public async fetchRemoteConfig(
    token: string,
    projectId: string,
    environment: string = 'development'
  ): Promise<ProjectConfigPayload> {
    return this.platformClient.get<ProjectConfigPayload>(
      `/v1/projects/${encodeURIComponent(projectId)}/config?environment=${encodeURIComponent(environment)}`,
      { token }
    )
  }

  /**
   * Executes complete configuration sync between Dashboard and local project.
   */
  public async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const projectDir = options.dir ? options.dir : process.cwd()
    const targetEnv = options.environment || 'development'

    // 1. Read local manifest
    const manifest = await ProjectMetadata.readManifest(projectDir)
    if (!manifest) {
      throw new Error('No Solarch project manifest found in current directory. Run "solarch init" first.')
    }

    if (!manifest.platform) {
      throw new Error('Project is not linked to Solarch Platform. Run "solarch link" first.')
    }

    const { projectId, orgId } = manifest.platform

    // 2. Resolve authentication
    const resolved = await this.authService.resolveSession(options.token)
    if (!resolved.session.isAuthenticated() || !resolved.credentials?.accessToken) {
      throw new Error('Authentication required to sync project configuration. Run "solarch login" first.')
    }

    // 3. Fetch remote project configuration
    const remoteConfig = await this.fetchRemoteConfig(
      resolved.credentials.accessToken,
      projectId,
      targetEnv
    )

    // 4. Merge .env
    const envPath = path.join(projectDir, '.env')
    const existingEnvContent = fs.existsSync(envPath)
      ? await fs.promises.readFile(envPath, 'utf-8')
      : ''

    const envMergeResult = EnvMerger.merge(
      existingEnvContent,
      remoteConfig.envVars || {},
      {
        environment: targetEnv,
        force: options.force,
      }
    )

    // 5. Check SDK reconciliation
    const remoteSdks = remoteConfig.requiredSdks || []
    const installedDeps = SdkInstaller.readInstalledDependencies(projectDir)
    const missingSdks: string[] = []

    for (const sdk of remoteSdks) {
      if (!(sdk in installedDeps)) {
        missingSdks.push(sdk)
      }
    }

    // 6. Write changes if not dry-run
    if (!options.dryRun) {
      // Write .env with 0o600
      await EnvMerger.writeEnvFile(envPath, envMergeResult.content)

      // Update manifest metadata if remote specifies plugins or SDKs
      let manifestChanged = false
      if (remoteConfig.plugins) {
        manifest.plugins = {
          mode: remoteConfig.plugins.mode || manifest.plugins.mode,
          list: Array.from(
            new Set([...manifest.plugins.list, ...(remoteConfig.plugins.list || [])])
          ),
        }
        manifestChanged = true
      }

      if (remoteSdks.length > 0) {
        const mergedSdks = Array.from(new Set([...manifest.sdks, ...remoteSdks]))
        if (mergedSdks.length !== manifest.sdks.length) {
          manifest.sdks = mergedSdks
          manifestChanged = true
        }
      }

      if (manifestChanged) {
        manifest.updatedAt = new Date().toISOString()
        await ProjectMetadata.writeManifest(projectDir, manifest)
      }
    }

    return {
      projectId,
      orgId,
      environment: targetEnv,
      envChanges: {
        added: envMergeResult.added,
        updated: envMergeResult.updated,
        preserved: envMergeResult.preserved,
      },
      manifestUpdated: !options.dryRun,
      missingSdks,
      dryRun: options.dryRun ?? false,
    }
  }
}
