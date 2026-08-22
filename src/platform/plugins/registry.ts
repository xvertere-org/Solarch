/**
 * Solarch Platform Official Plugin Registry (Phase 5)
 *
 * Canonical catalog of official @solarch/plugin-* extensions.
 */

import { PluginDescriptor } from './types.js'

export const OFFICIAL_PLUGINS: Record<string, PluginDescriptor> = {
  '@solarch/plugin-auth-oauth': {
    id: '@solarch/plugin-auth-oauth',
    name: 'auth-oauth',
    title: 'OAuth2 Multi-Provider Authentication',
    description: 'OAuth2 authentication flows for Google, GitHub, and Apple with token exchange',
    category: 'auth',
    source: 'official',
    publisher: 'Solarch Core Team',
    version: '1.0.0',
    requiresCapabilities: {
      'auth.enabled': true,
    },
    requiresSdks: ['@solarch/core-client'],
    configSchema: {
      type: 'object',
      properties: {
        providers: { type: 'array', items: { type: 'string' } },
        redirectUriPath: { type: 'string' },
      },
    },
    defaultConfig: {
      providers: ['google', 'github'],
      redirectUriPath: '/api/auth/callback',
    },
    environmentRequirements: [
      { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID', secret: false, optional: true },
      { key: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret', secret: true, optional: true },
      { key: 'GITHUB_CLIENT_ID', description: 'GitHub OAuth App Client ID', secret: false, optional: true },
      { key: 'GITHUB_CLIENT_SECRET', description: 'GitHub OAuth App Client Secret', secret: true, optional: true },
    ],
    hooks: ['onInit', 'onAuth'],
  },

  '@solarch/plugin-storage-s3': {
    id: '@solarch/plugin-storage-s3',
    name: 'storage-s3',
    title: 'S3 & R2 Object Storage Adapter',
    description: 'S3-compatible blob storage adapter supporting AWS S3, Cloudflare R2, and MinIO',
    category: 'storage',
    source: 'official',
    publisher: 'Solarch Core Team',
    version: '1.0.0',
    requiresCapabilities: {
      'storage.enabled': true,
    },
    configSchema: {
      type: 'object',
      properties: {
        region: { type: 'string' },
        bucket: { type: 'string' },
        endpoint: { type: 'string' },
      },
      required: ['bucket'],
    },
    defaultConfig: {
      region: 'ap-south-1',
      bucket: 'app-assets',
    },
    environmentRequirements: [
      { key: 'AWS_ACCESS_KEY_ID', description: 'S3 / R2 Access Key ID', secret: true },
      { key: 'AWS_SECRET_ACCESS_KEY', description: 'S3 / R2 Secret Access Key', secret: true },
      { key: 'S3_ENDPOINT', description: 'Custom S3 endpoint for R2 or MinIO', secret: false, optional: true },
    ],
    hooks: ['onInit', 'onRequest'],
  },

  '@solarch/plugin-billing-stripe': {
    id: '@solarch/plugin-billing-stripe',
    name: 'billing-stripe',
    title: 'Stripe Webhook & Subscription Billing',
    description: 'Stripe payment webhooks, subscription sync, and customer portal routing',
    category: 'billing',
    source: 'official',
    publisher: 'Solarch Core Team',
    version: '1.0.0',
    configSchema: {
      type: 'object',
      properties: {
        webhookPath: { type: 'string' },
      },
    },
    defaultConfig: {
      webhookPath: '/api/webhooks/stripe',
    },
    environmentRequirements: [
      { key: 'STRIPE_SECRET_KEY', description: 'Stripe Secret API Key', secret: true },
      { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe Webhook Signing Secret', secret: true },
    ],
    hooks: ['onInit', 'onRequest'],
  },

  '@solarch/plugin-telemetry-otel': {
    id: '@solarch/plugin-telemetry-otel',
    name: 'telemetry-otel',
    title: 'OpenTelemetry & Prometheus Tracing',
    description: 'Distributed tracing, metric instrumentation, and OpenTelemetry OTLP exporter',
    category: 'monitoring',
    source: 'official',
    publisher: 'Solarch Core Team',
    version: '1.0.0',
    configSchema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        endpoint: { type: 'string' },
      },
    },
    defaultConfig: {
      serviceName: 'solarch-app',
      endpoint: 'http://localhost:4318',
    },
    environmentRequirements: [
      { key: 'OTEL_EXPORTER_OTLP_ENDPOINT', description: 'OTLP Collector Endpoint', secret: false, optional: true },
      { key: 'OTEL_EXPORTER_OTLP_HEADERS', description: 'OTLP Exporter Auth Headers', secret: true, optional: true },
    ],
    hooks: ['onInit', 'onRequest', 'onShutdown'],
  },

  '@solarch/plugin-search-pgvector': {
    id: '@solarch/plugin-search-pgvector',
    name: 'search-pgvector',
    title: 'PostgreSQL pgvector Semantic Search',
    description: 'Vector similarity search and embeddings storage provider for PostgreSQL with pgvector',
    category: 'ai',
    source: 'official',
    publisher: 'Solarch Core Team',
    version: '1.0.0',
    requiresCapabilities: {
      'database.engine': 'postgres',
      'database.features.vector': true,
      'ai.enabled': true,
    },
    requiresSdks: ['solarch-ai'],
    configSchema: {
      type: 'object',
      properties: {
        dimensions: { type: 'number' },
        distanceMetric: { type: 'string', enum: ['cosine', 'l2', 'inner_product'] },
      },
    },
    defaultConfig: {
      dimensions: 1536,
      distanceMetric: 'cosine',
    },
    environmentRequirements: [],
    hooks: ['onInit', 'onMigration'],
  },
}

export class PluginRegistry {
  public static getAll(): PluginDescriptor[] {
    return Object.values(OFFICIAL_PLUGINS)
  }

  public static get(idOrName: string): PluginDescriptor | undefined {
    const normalized = PluginRegistry.normalizeId(idOrName)
    return OFFICIAL_PLUGINS[normalized]
  }

  public static getByCategory(category: string): PluginDescriptor[] {
    return Object.values(OFFICIAL_PLUGINS).filter((p) => p.category === category)
  }

  public static normalizeId(idOrName: string): string {
    if (idOrName.startsWith('@solarch/plugin-')) {
      return idOrName
    }
    if (idOrName.startsWith('@') || idOrName.startsWith('local:')) {
      return idOrName
    }
    return `@solarch/plugin-${idOrName}`
  }

  public static getShortName(id: string): string {
    if (id.startsWith('@solarch/plugin-')) {
      return id.replace('@solarch/plugin-', '')
    }
    if (id.startsWith('local:')) {
      return id.replace('local:', '')
    }
    return id
  }
}
