/**
 * Solarch Platform Deterministic Deployment Packager (Phase 7)
 *
 * Builds deterministic, reproducible deployment bundles with SHA256 checksums.
 * Has zero platform mutation capabilities.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { DeploymentScanner } from './scanner.js'
import { DeploymentBundleResult, DeploymentBundleSpec, HealthCheckSpec } from './types.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

export interface PackagerOptions {
  environment: string
  commitSha?: string
  branch?: string
  dirtyState?: boolean
  entrypoint?: string
  buildCommand?: string
  healthCheck?: Partial<HealthCheckSpec>
}

export class DeploymentPackager {
  /**
   * Scans project, verifies zero secret leaks, and computes deterministic bundle hash.
   */
  public static async createBundle(
    projectDir: string,
    manifest: ProjectManifest,
    options: PackagerOptions
  ): Promise<DeploymentBundleResult> {
    const { includedFiles, scanResult } = await DeploymentScanner.scanProject(projectDir)

    if (!scanResult.passed) {
      const leakDetails = scanResult.leaks
        .map((l) => `  • ${l.file}:${l.line} [${l.rule}] -> "${l.snippet}"`)
        .join('\n')
      throw new Error(`Deployment packaging aborted due to detected secret leaks:\n${leakDetails}`)
    }

    // Compute deterministic SHA256 over all included file contents in alphabetical order
    const hash = crypto.createHash('sha256')
    let totalBytes = 0

    for (const relativePath of includedFiles) {
      const fullPath = path.join(projectDir, relativePath)
      const fileBuffer = await fs.promises.readFile(fullPath)
      totalBytes += fileBuffer.length

      // Feed normalized relative path + content into hash
      hash.update(Buffer.from(relativePath, 'utf-8'))
      hash.update(fileBuffer)
    }

    const bundleHash = `sha256:${hash.digest('hex')}`

    const healthCheck: HealthCheckSpec = {
      path: options.healthCheck?.path || '/api/health',
      method: options.healthCheck?.method || 'GET',
      expectedStatus: options.healthCheck?.expectedStatus || 200,
      timeoutMs: options.healthCheck?.timeoutMs || 5000,
      retries: options.healthCheck?.retries || 3,
    }

    // Detect package manager and lockfile hash
    let packageManager = 'npm'
    let lockfileHash: string | undefined
    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']
    for (const lf of lockfiles) {
      const lfPath = path.join(projectDir, lf)
      if (fs.existsSync(lfPath)) {
        if (lf.startsWith('pnpm')) packageManager = 'pnpm'
        else if (lf.startsWith('yarn')) packageManager = 'yarn'
        else if (lf.startsWith('bun')) packageManager = 'bun'
        else packageManager = 'npm'

        try {
          const content = await fs.promises.readFile(lfPath)
          lockfileHash = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
        } catch {}
        break
      }
    }

    const dbEngine = manifest.database?.engine || 'sqlite'
    const dbProvider = manifest.database?.provider || 'local'
    const dbTopology = manifest.database?.topology || 'standalone'
    const databaseTopologyRevision = `${dbEngine}:${dbProvider}:${dbTopology}`

    const spec: DeploymentBundleSpec = {
      projectId: manifest.platform?.projectId || manifest.name,
      environment: options.environment,
      bundleHash,
      commitSha: options.commitSha,
      branch: options.branch,
      dirtyState: options.dirtyState,
      runtimeVersion: manifest.runtimeVersion,
      cliVersion: '0.19.8',
      entrypoint: options.entrypoint || 'src/index.ts',
      buildCommand: options.buildCommand,
      packageManager,
      lockfileHash,
      platformConfigVersion: (manifest.platform as any)?.configVersion || 1,
      databaseTopologyRevision,
      healthCheck,
      createdAt: new Date().toISOString(),
    }

    return {
      bundleHash,
      spec,
      includedFiles,
      fileCount: includedFiles.length,
      totalBytes,
    }
  }
}
