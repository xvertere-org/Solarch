/**
 * Solarch CLI Platform Subsystem (Phase 2, 3 & 4)
 */

export * from './config.js'
export * from './auth/types.js'
export * from './auth/session-store.js'
export * from './auth/callback-server.js'
export * from './auth/auth-service.js'
export * from './auth/browser.js'
export * from './client/platform-client.js'
export * from './client/users.js'
export * from './client/organizations.js'
export * from './client/projects.js'

// Phase 3: SDK Provisioning & Dashboard Synchronization
export * from './sdk/types.js'
export * from './sdk/catalog.js'
export * from './sdk/registry.js'
export * from './sdk/package-manager.js'
export * from './sdk/installer.js'
export * from './sync/types.js'
export * from './sync/env-merger.js'
export * from './sync/sync-service.js'

// Phase 4: Dashboard Configuration & Capability Management
export * from './schema/capability.js'
export * from './schema/database-metadata.js'
export * from './schema/environment-spec.js'
export * from './schema/project-config.js'
export * from './state/base-snapshot.js'
export * from './capabilities/matrix.js'
export * from './capabilities/resolver.js'
export * from './reconciliation/types.js'
export * from './reconciliation/differ.js'
export * from './reconciliation/reconciler.js'
export * from './client/capabilities.js'

// Phase 5: Plugin Ecosystem
export * from './plugins/index.js'

// Phase 6: Database Remote Provisioning & Topology Sync
export * from './database/index.js'

// Phase 7: Remote Deployments & Production Orchestration
export * from './deployment/index.js'

// Phase 8: Production Services, Telemetry & Observability
export * from './telemetry/index.js'

// Phase 9: Production Service Management, Health Monitoring & E2E Integration
export * from './service/index.js'

// Phase 10: MCP Integration & Agent Tooling Layer
export * from './mcp/index.js'

