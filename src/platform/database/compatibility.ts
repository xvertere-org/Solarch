/**
 * Solarch Platform Database Engine / Provider / Topology Compatibility Matrix (Phase 6)
 */

import {
  DatabaseEngine,
  DatabaseProvider,
  DatabaseTopology,
  DatabaseCompatibilityResult,
} from './types.js'

export const COMPATIBILITY_MATRIX: Record<
  DatabaseEngine,
  Record<DatabaseProvider, DatabaseTopology[]>
> = {
  sqlite: {
    local: ['standalone'],
    neon: [],
    supabase: [],
    atlas: [],
    custom: ['standalone'],
  },
  postgres: {
    local: ['standalone'],
    neon: ['serverless'],
    supabase: ['standalone', 'replica'],
    atlas: [],
    custom: ['standalone', 'replica', 'serverless'],
  },
  mongodb: {
    local: ['standalone'],
    neon: [],
    supabase: [],
    atlas: ['standalone', 'replica', 'serverless', 'sharded'],
    custom: ['standalone', 'replica', 'sharded'],
  },
}

export class DatabaseCompatibility {
  public static validate(
    engine: DatabaseEngine,
    provider: DatabaseProvider,
    topology: DatabaseTopology
  ): DatabaseCompatibilityResult {
    const providerMap = COMPATIBILITY_MATRIX[engine]
    if (!providerMap) {
      return { compatible: false, error: `Unsupported database engine: ${engine}` }
    }

    const topologies = providerMap[provider]
    if (!topologies || topologies.length === 0) {
      return {
        compatible: false,
        error: `Provider "${provider}" is not compatible with engine "${engine}".`,
      }
    }

    if (!topologies.includes(topology)) {
      return {
        compatible: false,
        error: `Topology "${topology}" is not supported for ${engine} on provider "${provider}". Supported topologies: ${topologies.join(', ')}.`,
      }
    }

    return { compatible: true }
  }

  public static getDefaultProvider(engine: DatabaseEngine): DatabaseProvider {
    switch (engine) {
      case 'sqlite':
        return 'local'
      case 'postgres':
        return 'neon'
      case 'mongodb':
        return 'atlas'
    }
  }

  public static getDefaultTopology(
    engine: DatabaseEngine,
    provider: DatabaseProvider
  ): DatabaseTopology {
    if (engine === 'sqlite') return 'standalone'
    if (provider === 'neon') return 'serverless'
    if (provider === 'atlas') return 'replica'
    return 'standalone'
  }
}
