/**
 * Solarch CLI — MCP Tool Registry (Phase 10)
 *
 * Central registry declaring all Solarch capabilities as structured MCP tools
 * with risk classification and parameter schemas for external agents.
 */

import { McpToolDefinition, McpServerConfig, ToolCategory, ToolRiskLevel } from './types.js'

const TOOL_DEFINITIONS: McpToolDefinition[] = [
  // ================= PROJECT TOOLS =================
  {
    name: 'project.inspect',
    category: 'project',
    description: 'Inspect local Solarch project metadata, manifest, application type, and topology.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      dir: { type: 'string', description: 'Root directory of the Solarch project' },
    },
  },
  {
    name: 'project.config',
    category: 'project',
    description: 'Read active platform project configuration and environment variables.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      environment: { type: 'string', description: 'Target environment (development, staging, production)' },
    },
  },
  {
    name: 'project.dependencies',
    category: 'project',
    description: 'List installed Solarch SDKs, plugins, and ecosystem dependencies.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      dir: { type: 'string', description: 'Root directory of the Solarch project' },
    },
  },

  // ================= DATABASE TOOLS =================
  {
    name: 'database.status',
    category: 'database',
    description: 'Check database connectivity, provider status, and topology health.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'database.schema.inspect',
    category: 'database',
    description: 'Inspect tables, columns, indexes, and vector embeddings in the database schema.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      tables: { type: 'array', description: 'Optional list of table names to filter' },
    },
  },
  {
    name: 'database.migrations.list',
    category: 'database',
    description: 'List applied and pending database migrations with checksum verification.',
    risk: 'read',
    approvalRequired: false,
    parameters: {},
  },
  {
    name: 'database.migration.plan',
    category: 'database',
    description: 'Generate dry-run plan for pending database schema changes without executing them.',
    risk: 'read',
    approvalRequired: false,
    parameters: {},
  },
  {
    name: 'database.migration.apply',
    category: 'database',
    description: 'Apply pending schema migrations to the target database.',
    risk: 'destructive',
    approvalRequired: true,
    parameters: {
      environment: { type: 'string', description: 'Target database environment' },
      dryRun: { type: 'boolean', description: 'Simulate migration without committing changes' },
    },
  },

  // ================= DEPLOYMENT TOOLS =================
  {
    name: 'deployment.list',
    category: 'deployment',
    description: 'List recent deployments with release tags, commit SHA provenance, and health status.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      environment: { type: 'string', description: 'Target environment' },
      limit: { type: 'number', description: 'Maximum number of deployments to return' },
    },
  },
  {
    name: 'deployment.status',
    category: 'deployment',
    description: 'Get real-time health and rollout status of active deployment.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      deploymentId: { type: 'string', description: 'Deployment ID to inspect' },
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'deployment.logs',
    category: 'deployment',
    description: 'Fetch deployment build and runtime stdout/stderr logs with redaction.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      deploymentId: { type: 'string', description: 'Deployment identifier' },
      tail: { type: 'number', description: 'Number of lines to tail' },
    },
  },
  {
    name: 'deployment.deploy',
    category: 'deployment',
    description: 'Deploy project bundle to cloud platform with health verification.',
    risk: 'production_mutation',
    approvalRequired: true,
    parameters: {
      environment: { type: 'string', description: 'Target environment (staging, production)' },
      tag: { type: 'string', description: 'Release tag or version label' },
    },
  },
  {
    name: 'deployment.rollback',
    category: 'deployment',
    description: 'Rollback active deployment to previous verified release.',
    risk: 'production_mutation',
    approvalRequired: true,
    parameters: {
      environment: { type: 'string', description: 'Target environment' },
      targetDeploymentId: { type: 'string', description: 'Specific deployment ID to rollback to' },
    },
  },

  // ================= SERVICE TOOLS =================
  {
    name: 'service.status',
    category: 'service',
    description: 'Check active service status, replica counts, error rate, and p95 latency.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'service.scale',
    category: 'service',
    description: 'Scale service compute replicas (minReplicas, maxReplicas).',
    risk: 'production_mutation',
    approvalRequired: true,
    parameters: {
      minReplicas: { type: 'number', description: 'Minimum number of replicas' },
      maxReplicas: { type: 'number', description: 'Maximum number of replicas' },
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'service.traffic',
    category: 'service',
    description: 'Configure canary traffic split percentage between active deployments.',
    risk: 'production_mutation',
    approvalRequired: true,
    parameters: {
      canaryPercent: { type: 'number', description: 'Percentage of traffic routed to canary (0-100)' },
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'service.maintenance',
    category: 'service',
    description: 'Enable or disable maintenance mode on a service.',
    risk: 'production_mutation',
    approvalRequired: true,
    parameters: {
      enabled: { type: 'boolean', description: 'Whether maintenance mode is active' },
      message: { type: 'string', description: 'Public maintenance explanation message' },
      environment: { type: 'string', description: 'Target environment' },
    },
  },

  // ================= TELEMETRY TOOLS =================
  {
    name: 'telemetry.metrics',
    category: 'telemetry',
    description: 'Query aggregated service metrics: request volume, error rate, p50, p95, p99 latencies.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      timeRange: { type: 'string', description: 'Time range (15m, 1h, 24h, 7d)' },
      environment: { type: 'string', description: 'Target environment' },
    },
  },
  {
    name: 'telemetry.logs',
    category: 'telemetry',
    description: 'Query pre-redacted structured log entries filtered by level, trace ID, or query string.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      level: { type: 'string', description: 'Filter by log level (error, warn, info)' },
      query: { type: 'string', description: 'Search term for log message filtering' },
      limit: { type: 'number', description: 'Maximum logs to fetch' },
    },
  },
  {
    name: 'telemetry.traces',
    category: 'telemetry',
    description: 'Retrieve W3C distributed trace spans and waterfall execution timing.',
    risk: 'read',
    approvalRequired: false,
    parameters: {
      traceId: { type: 'string', description: 'W3C trace ID to inspect' },
    },
  },
]

export class McpRegistry {
  private static tools: Map<string, McpToolDefinition> = new Map(
    TOOL_DEFINITIONS.map((t) => [t.name, t])
  )

  public static getAllTools(): McpToolDefinition[] {
    return Array.from(this.tools.values())
  }

  public static getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name)
  }

  public static getToolsByCategory(category: ToolCategory): McpToolDefinition[] {
    return this.getAllTools().filter((t) => t.category === category)
  }

  public static getToolsByRisk(risk: ToolRiskLevel): McpToolDefinition[] {
    return this.getAllTools().filter((t) => t.risk === risk)
  }

  public static getServerConfig(): McpServerConfig {
    return {
      packageName: '@solarch/mcp-server',
      version: '0.20.0',
      capabilities: [
        'project.inspect',
        'project.config',
        'database.inspect_schema',
        'database.migrations',
        'deployment.status',
        'deployment.deploy',
        'service.status',
        'service.traffic',
        'telemetry.metrics',
      ],
      toolsCount: this.tools.size,
      supportedTransports: ['stdio', 'http-sse'],
    }
  }
}
