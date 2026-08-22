/**
 * Solarch CLI Three-Way Reconciliation Types (Phase 4)
 */

import { PlatformProjectConfig } from '../schema/project-config.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffEntry {
  field: string
  category: 'capability' | 'sdk' | 'plugin' | 'database' | 'environment'
  baseValue?: any
  localValue?: any
  remoteValue?: any
  type: DiffType
  isConflict: boolean
  resolvedValue?: any
  resolutionStrategy?: 'local' | 'remote' | 'merged'
}

export interface ThreeWayDiffResult {
  entries: DiffEntry[]
  hasConflicts: boolean
  localChangesCount: number
  remoteChangesCount: number
  isUpToDate: boolean
}

export interface ReconciliationPlan {
  mergedRemoteConfig: PlatformProjectConfig
  manifestPatch: Partial<ProjectManifest>
  diffResult: ThreeWayDiffResult
  isIdempotent: boolean
}
