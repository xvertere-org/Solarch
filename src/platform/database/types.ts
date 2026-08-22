/**
 * Solarch Platform Database Provisioning & Topology Types (Phase 6)
 */

import { DatabaseEngine, DatabaseProvider } from '../schema/database-metadata.js'

export { DatabaseEngine, DatabaseProvider }
export type DatabaseTopology = 'standalone' | 'replica' | 'serverless' | 'sharded'
export type ProvisionStatus = 'pending' | 'provisioning' | 'ready' | 'failed' | 'cancelled'

export interface DatabaseMetadataSpec {
  engine: DatabaseEngine
  provider: DatabaseProvider
  topology: DatabaseTopology
  host?: string
  port?: number
  databaseName?: string
  ssl?: boolean
  secretRefs: string[]
}

export interface ProvisionRequest {
  projectId: string
  environment: string
  engine: DatabaseEngine
  provider: DatabaseProvider
  topology: DatabaseTopology
  idempotencyKey?: string
  region?: string
}

export interface ProvisionOperation {
  operationId: string
  projectId: string
  environment: string
  status: ProvisionStatus
  createdAt: string
  updatedAt: string
  error?: string
  metadata?: DatabaseMetadataSpec
  connectionSecret?: {
    envKey: string
    secretValue: string
  }
}

export interface DatabaseCompatibilityResult {
  compatible: boolean
  error?: string
}
