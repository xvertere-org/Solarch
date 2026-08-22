/**
 * Solarch CLI Ecosystem — Deterministic Recommendation Engine (Phase 0)
 *
 * Implements pure, deterministic recommendation rules with explanation provenance:
 *
 * Database Hierarchy:
 * 1. Explicit user database choice (overrides all)
 * 2. Explicit deployment requirement (e.g. local + cloud -> sqlite_local_postgres_cloud)
 * 3. Application-type recommendation (AI/Agent -> PostgreSQL + pgvector)
 * 4. Feature requirements
 * 5. Solarch default (SQLite)
 *
 * SDK Rules:
 * - Web -> solarch-web
 * - AI / Agent -> solarch-ai
 * - Mobile -> solarch-rn
 * - Desktop -> solarch-electron (Electron) / solarch-tauri (Tauri)
 */

import { ProjectIntent, DesktopRuntime } from './intent'
import { DatabaseStrategy, DatabaseEngine, DatabaseTopology, DatabaseCapabilities } from './database'
import { SdkSelection, Recommendation, SdkRecommendationItem } from './selection'
import { PluginSelection } from './plugin'
import { ProjectPlan, ProjectIdentity } from './plan'

export interface RecommendationResult {
  database: Recommendation<DatabaseEngine>
  databaseTopology: DatabaseTopology
  databaseCapabilities: DatabaseCapabilities
  sdks: SdkRecommendationItem[]
  desktopRuntime?: Recommendation<DesktopRuntime>
}

export class RecommendationEngine {
  /**
   * Evaluates intent and produces deterministic recommendations with explanations.
   */
  public static recommend(intent: ProjectIntent): RecommendationResult {
    const dbRec = RecommendationEngine.recommendDatabase(intent)
    const sdkRecs = RecommendationEngine.recommendSdks(intent)

    let desktopRec: Recommendation<DesktopRuntime> | undefined
    if (intent.application === 'desktop') {
      desktopRec = {
        value: intent.desktopRuntime !== 'unspecified' ? intent.desktopRuntime : 'electron',
        reason: 'Electron provides seamless TypeScript/Node runtime integration for desktop applications.',
        source: 'application-type',
      }
    }

    return {
      database: dbRec.engine,
      databaseTopology: dbRec.topology,
      databaseCapabilities: dbRec.capabilities,
      sdks: sdkRecs,
      desktopRuntime: desktopRec,
    }
  }

  /**
   * Resolves the recommended database strategy with reason.
   */
  private static recommendDatabase(intent: ProjectIntent): {
    engine: Recommendation<DatabaseEngine>
    topology: DatabaseTopology
    capabilities: DatabaseCapabilities
  } {
    // 1. Explicit user choice (highest precedence)
    if (intent.isExplicit('database') && intent.explicitChoices.database) {
      const explicitDb = intent.explicitChoices.database.toLowerCase() as DatabaseEngine
      const hasVector = (intent.application === 'ai' || intent.application === 'agent') && explicitDb === 'postgres'
      return {
        engine: {
          value: explicitDb,
          reason: `Explicitly chosen by user (${explicitDb}).`,
          source: 'default',
        },
        topology: explicitDb === 'postgres' ? 'postgres_only' : explicitDb === 'mongodb' ? 'mongodb_only' : 'sqlite_only',
        capabilities: { vector: hasVector },
      }
    }

    // 2. Explicit deployment requirement: local + cloud hybrid
    if (intent.deployment === 'local_and_cloud') {
      return {
        engine: {
          value: 'postgres',
          reason: 'Hybrid local + cloud deployment uses SQLite for zero-latency local development and PostgreSQL for cloud production.',
          source: 'deployment',
        },
        topology: 'sqlite_local_postgres_cloud',
        capabilities: {
          vector: intent.application === 'ai' || intent.application === 'agent',
        },
      }
    }

    // 3. Application-type recommendations
    if (intent.application === 'ai' || intent.application === 'agent') {
      return {
        engine: {
          value: 'postgres',
          reason: 'AI and autonomous agent workloads benefit from PostgreSQL with pgvector for relational data and semantic embeddings without a separate vector DB.',
          source: 'application-type',
        },
        topology: 'postgres_only',
        capabilities: { vector: true },
      }
    }

    if (intent.application === 'saas') {
      return {
        engine: {
          value: 'postgres',
          reason: 'Multi-tenant SaaS architectures benefit from PostgreSQL row-level isolation and enterprise pooling.',
          source: 'application-type',
        },
        topology: 'postgres_only',
        capabilities: { multiTenant: true },
      }
    }

    // 4. Default baseline: SQLite (WAL mode)
    return {
      engine: {
        value: 'sqlite',
        reason: 'Embedded SQLite in WAL mode provides zero-config local persistence and optimal single-node throughput.',
        source: 'default',
      },
      topology: 'sqlite_only',
      capabilities: {},
    }
  }

  /**
   * Resolves the recommended SDKs based on application type.
   */
  private static recommendSdks(intent: ProjectIntent): SdkRecommendationItem[] {
    const recs: SdkRecommendationItem[] = []

    switch (intent.application) {
      case 'ai':
      case 'agent':
        recs.push({
          packageName: 'solarch-ai',
          reason: 'Provides streaming chat completions, vector embeddings, and agent tool execution.',
          source: 'application-type',
        })
        break

      case 'web':
      case 'saas':
      case 'realtime':
        recs.push({
          packageName: 'solarch-web',
          reason: 'Provides browser client for REST CRUD, Auth flows, and Realtime WebSocket subscriptions.',
          source: 'application-type',
        })
        break

      case 'mobile':
        recs.push({
          packageName: 'solarch-rn',
          reason: 'Provides React Native / Expo client with offline cache and sync.',
          source: 'application-type',
        })
        break

      case 'desktop':
        if (intent.desktopRuntime === 'tauri') {
          recs.push({
            packageName: 'solarch-tauri',
            reason: 'Provides native Rust desktop bridge for Tauri applications.',
            source: 'desktop-runtime',
          })
        } else {
          recs.push({
            packageName: 'solarch-electron',
            reason: 'Provides cross-platform IPC bridge for Electron desktop applications.',
            source: 'desktop-runtime',
          })
        }
        break

      case 'api':
      case 'custom':
      default:
        // Core API backend can use web SDK or communicate directly via REST
        recs.push({
          packageName: 'solarch-web',
          reason: 'Standard client for Solarch REST API communication.',
          source: 'default',
        })
        break
    }

    return recs
  }

  /**
   * Composes a complete ProjectPlan from ProjectIntent applying the recommendation hierarchy
   * and respecting explicit user overrides.
   */
  public static createPlan(identity: ProjectIdentity, intent: ProjectIntent): ProjectPlan {
    const recs = RecommendationEngine.recommend(intent)

    // Database resolution: user explicit choice > recommendation
    let dbStrategy: DatabaseStrategy
    if (intent.isExplicit('database') && intent.explicitChoices.database) {
      const explicitEngine = intent.explicitChoices.database.toLowerCase() as DatabaseEngine
      dbStrategy = new DatabaseStrategy({
        engine: explicitEngine,
        topology: explicitEngine === 'postgres' ? 'postgres_only' : explicitEngine === 'mongodb' ? 'mongodb_only' : 'sqlite_only',
        capabilities: recs.databaseCapabilities,
        source: 'user',
      })
    } else {
      dbStrategy = new DatabaseStrategy({
        engine: recs.database.value,
        topology: recs.databaseTopology,
        capabilities: recs.databaseCapabilities,
        source: 'recommendation',
      })
    }

    // SDK selection: user explicit choice > recommendation
    let sdkSelection: SdkSelection
    if (intent.isExplicit('sdks') && intent.explicitChoices.sdks) {
      sdkSelection = new SdkSelection({
        selected: intent.explicitChoices.sdks,
        recommended: recs.sdks,
        source: 'user',
      })
    } else {
      sdkSelection = new SdkSelection({
        recommended: recs.sdks,
        source: 'recommendation',
      })
    }

    // Plugin selection
    let pluginSelection: PluginSelection
    if (intent.isExplicit('plugins') && intent.explicitChoices.plugins) {
      pluginSelection = new PluginSelection({
        mode: 'selected',
        plugins: intent.explicitChoices.plugins,
      })
    } else {
      pluginSelection = new PluginSelection({
        mode: 'none',
      })
    }

    // Desktop runtime
    const desktopRuntime = intent.desktopRuntime !== 'unspecified'
      ? intent.desktopRuntime
      : (recs.desktopRuntime?.value ?? 'unspecified')

    return new ProjectPlan({
      identity,
      intent,
      database: dbStrategy,
      sdks: sdkSelection,
      plugins: pluginSelection,
      desktop: {
        runtime: desktopRuntime,
      },
    })
  }
}
