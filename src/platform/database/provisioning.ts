/**
 * Solarch Platform Database Provisioning Orchestrator (Phase 6)
 *
 * Handles asynchronous provisioning, polling, idempotency, and secret isolation.
 */

import * as fs from 'fs'
import * as path from 'path'
import { DatabaseProvisionClient } from './client.js'
import { ProvisionRequest, ProvisionOperation, DatabaseMetadataSpec } from './types.js'
import { EnvMerger } from '../sync/env-merger.js'
import { EnvironmentTarget } from '../sync/types.js'
import { ProjectMetadata, ProjectManifest } from '../../ecosystem/metadata.js'

export interface ProvisionOrchestratorOptions {
  timeoutMs?: number
  pollIntervalMs?: number
  logger?: {
    info(msg: string): void
    warn(msg: string): void
    error(msg: string): void
  }
}

export class DatabaseProvisionOrchestrator {
  private client: DatabaseProvisionClient
  private options: ProvisionOrchestratorOptions

  constructor(client: DatabaseProvisionClient, options: ProvisionOrchestratorOptions = {}) {
    this.client = client
    this.options = {
      timeoutMs: 60000,
      pollIntervalMs: 1000,
      ...options,
    }
  }

  /**
   * Generates a deterministic idempotency key for provisioning requests.
   */
  public static createIdempotencyKey(
    projectId: string,
    environment: string,
    engine: string,
    provider: string,
    topology: string
  ): string {
    return `db-prov:${projectId}:${environment}:${engine}:${provider}:${topology}`
  }

  /**
   * Submits a provisioning request and polls until ready, failed, or timed out.
   */
  public async provisionAndAwait(
    request: ProvisionRequest,
    accessToken: string
  ): Promise<ProvisionOperation> {
    const idempotencyKey =
      request.idempotencyKey ||
      DatabaseProvisionOrchestrator.createIdempotencyKey(
        request.projectId,
        request.environment,
        request.engine,
        request.provider,
        request.topology
      )

    const initialOp = await this.client.submitProvision(
      { ...request, idempotencyKey },
      accessToken
    )

    if (initialOp.status === 'ready' || initialOp.status === 'failed') {
      return initialOp
    }

    // Poll until complete
    const startTime = Date.now()
    const timeoutMs = this.options.timeoutMs || 60000
    const pollInterval = this.options.pollIntervalMs || 1000

    let currentOp = initialOp
    while (currentOp.status === 'pending' || currentOp.status === 'provisioning') {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Database provisioning timed out after ${timeoutMs}ms (Operation: ${currentOp.operationId}).`)
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      currentOp = await this.client.getOperationStatus(
        request.projectId,
        currentOp.operationId,
        accessToken
      )
    }

    if (currentOp.status === 'failed') {
      throw new Error(`Database provisioning failed: ${currentOp.error || 'Unknown error'}`)
    }

    return currentOp
  }

  /**
   * Applies the provisioned database results to the project:
   * 1. Writes secrets securely to .env (0o600)
   * 2. Updates .solarch/project.json manifest with metadata only
   */
  public static async applyProvisionedDatabase(
    projectDir: string,
    manifest: ProjectManifest,
    metadata: DatabaseMetadataSpec,
    environment: string = 'development',
    connectionSecret?: { envKey: string; secretValue: string }
  ): Promise<void> {
    // 1. Write connection credentials to .env (0o600)
    if (connectionSecret) {
      const envPath = path.join(projectDir, '.env')
      const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
      const merged = EnvMerger.merge(
        existing,
        { [connectionSecret.envKey]: connectionSecret.secretValue },
        { environment: environment as EnvironmentTarget, force: true }
      )
      await EnvMerger.writeEnvFile(envPath, merged.content)
    }

    // 2. Update manifest with metadata only (zero credentials)
    manifest.database = {
      engine: metadata.engine,
      topology: metadata.topology,
      provider: metadata.provider,
      secretRefs: metadata.secretRefs || ['DATABASE_URL'],
      capabilities: manifest.database?.capabilities || {},
      source: 'platform',
    }
    manifest.updatedAt = new Date().toISOString()

    await ProjectMetadata.writeManifest(projectDir, manifest)
  }
}
