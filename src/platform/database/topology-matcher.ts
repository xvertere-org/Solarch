/**
 * Solarch Platform Database Topology Matcher (Phase 6)
 */

import { DatabaseMetadataSpec } from './types.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

export interface TopologyMatchResult {
  inSync: boolean
  differences: string[]
  migrationRequired: boolean
}

export class DatabaseTopologyMatcher {
  public static compare(
    manifest: ProjectManifest,
    remote: DatabaseMetadataSpec
  ): TopologyMatchResult {
    const differences: string[] = []

    if (manifest.database.engine !== remote.engine) {
      differences.push(
        `Engine mismatch: local is "${manifest.database.engine}", remote is "${remote.engine}"`
      )
    }

    if (manifest.database.provider !== remote.provider) {
      differences.push(
        `Provider mismatch: local is "${manifest.database.provider || 'local'}", remote is "${remote.provider}"`
      )
    }

    if (manifest.database.topology !== remote.topology) {
      differences.push(
        `Topology mismatch: local is "${manifest.database.topology}", remote is "${remote.topology}"`
      )
    }

    return {
      inSync: differences.length === 0,
      differences,
      migrationRequired: manifest.database.engine !== remote.engine,
    }
  }
}
