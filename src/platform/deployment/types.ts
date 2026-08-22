/**
 * Solarch Platform Deployment & Production Lifecycle Types (Phase 7)
 */

export type DeploymentEnvironment = 'development' | 'staging' | 'production' | string
export type DeploymentProvider = 'cloudflare' | 'vercel' | 'fly' | 'railway' | 'docker' | 'custom'

export type DeploymentStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'health_checking'
  | 'healthy'
  | 'promoting'
  | 'active'
  | 'unhealthy'
  | 'failed'
  | 'cancelled'
  | 'rolled_back'
  | 'rollback_failed'

export interface HealthCheckSpec {
  path: string
  method: string
  expectedStatus: number
  timeoutMs: number
  retries: number
}

export interface DeploymentBundleSpec {
  projectId: string
  environment: string
  bundleHash: string
  commitSha?: string
  branch?: string
  dirtyState?: boolean
  runtimeVersion: string
  cliVersion: string
  entrypoint: string
  buildCommand?: string
  packageManager?: string
  lockfileHash?: string
  platformConfigVersion?: number
  databaseTopologyRevision?: string
  healthCheck: HealthCheckSpec
  createdAt: string
}

export interface DeploymentRecord {
  deploymentId: string
  projectId: string
  orgId?: string
  environment: string
  status: DeploymentStatus
  bundleHash: string
  commitSha?: string
  branch?: string
  dirtyState?: boolean
  packageManager?: string
  lockfileHash?: string
  platformConfigVersion?: number
  databaseTopologyRevision?: string
  deploymentUrl?: string
  createdAt: string
  updatedAt: string
  activatedAt?: string
  error?: string
  trafficPercentage?: number
}

export interface DeploymentScanResult {
  passed: boolean
  excludedFilesCount: number
  scannedFilesCount: number
  leaks: Array<{
    file: string
    line: number
    rule: string
    snippet: string
  }>
}

export interface DeploymentBundleResult {
  bundleHash: string
  spec: DeploymentBundleSpec
  includedFiles: string[]
  fileCount: number
  totalBytes: number
}
