export interface NavItem {
  id: string
  label: string
  path: string
  children?: NavItem[]
}

export const navigation: NavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    path: '/docs/getting-started',
    children: [
      { id: 'quick-start', label: 'Quick Start', path: '/docs/getting-started/quick-start' },
      { id: 'installation', label: 'Installation', path: '/docs/getting-started/installation' },
      { id: 'cli-commands', label: 'CLI Commands', path: '/docs/getting-started/cli-commands' },
      { id: 'first-steps', label: 'First Steps', path: '/docs/getting-started/first-steps' },
      { id: 'project-structure', label: 'Project Structure', path: '/docs/getting-started/project-structure' },
      { id: 'changelog', label: 'Changelog', path: '/docs/getting-started/changelog' },
      { id: 'agent-skill', label: 'Agent Skill', path: '/docs/getting-started/agent-skill' },
    ],
  },
  {
    id: 'authentication',
    label: 'Authentication',
    path: '/docs/authentication',
    children: [
      { id: 'email-password', label: 'Email / Password', path: '/docs/authentication/email-password' },
      { id: 'oauth2', label: 'OAuth2', path: '/docs/authentication/oauth2' },
      { id: 'otp', label: 'OTP', path: '/docs/authentication/otp' },
      { id: 'mfa-totp', label: 'MFA / TOTP', path: '/docs/authentication/mfa-totp' },
      { id: 'admin-auth', label: 'Admin Auth', path: '/docs/authentication/admin-auth' },
      { id: 'jwt-tokens', label: 'JWT Tokens', path: '/docs/authentication/jwt-tokens' },
      { id: 'user-impersonation', label: 'User Impersonation', path: '/docs/authentication/user-impersonation' },
    ],
  },
  {
    id: 'collections',
    label: 'Collections & Records',
    path: '/docs/collections',
    children: [
      { id: 'collection-types', label: 'Collection Types', path: '/docs/collections/collection-types' },
      { id: 'field-types', label: 'Field Types', path: '/docs/collections/field-types' },
      { id: 'api-rules', label: 'API Rules', path: '/docs/collections/api-rules' },
      { id: 'create-collection', label: 'Create a Collection', path: '/docs/collections/create-collection' },
      { id: 'crud-records', label: 'CRUD Records', path: '/docs/collections/crud-records' },
      { id: 'filter-syntax', label: 'Filter Syntax', path: '/docs/collections/filter-syntax' },
      { id: 'array-modifiers', label: 'Array Modifiers', path: '/docs/collections/array-modifiers' },
      { id: 'view-collections', label: 'View Collections', path: '/docs/collections/view-collections' },
      { id: 'back-relations', label: 'Back-Relations', path: '/docs/collections/back-relations' },
      { id: 'record-expansion', label: 'Record Expansion', path: '/docs/collections/record-expansion' },
    ],
  },
  {
    id: 'ai-tools',
    label: 'AI Tools',
    path: '/docs/ai-tools',
    children: [
      { id: 'supported-providers', label: 'Supported Providers', path: '/docs/ai-tools/supported-providers' },
      { id: 'configuration', label: 'Configuration', path: '/docs/ai-tools/configuration' },
      { id: 'schema-generator', label: 'Schema Generator', path: '/docs/ai-tools/schema-generator' },
      { id: 'rule-generator', label: 'Rule Generator', path: '/docs/ai-tools/rule-generator' },
      { id: 'data-seeder', label: 'Data Seeder', path: '/docs/ai-tools/data-seeder' },
      { id: 'chat-assistant', label: 'Chat Assistant', path: '/docs/ai-tools/chat-assistant' },
    ],
  },
  {
    id: 'vector-search',
    label: 'Vector Search',
    path: '/docs/vector-search',
    children: [
      { id: 'setup', label: 'Setup', path: '/docs/vector-search/setup' },
      { id: 'inserting-vectors', label: 'Inserting Vectors', path: '/docs/vector-search/inserting-vectors' },
      { id: 'search-api', label: 'Search API', path: '/docs/vector-search/search-api' },
      { id: 'sql-function', label: 'SQL Function', path: '/docs/vector-search/sql-function' },
    ],
  },
  {
    id: 'file-storage',
    label: 'File Storage',
    path: '/docs/file-storage',
    children: [
      { id: 'upload', label: 'Upload', path: '/docs/file-storage/upload' },
      { id: 'serve-files', label: 'Serve Files', path: '/docs/file-storage/serve-files' },
      { id: 'protected-tokens', label: 'Protected Tokens', path: '/docs/file-storage/protected-tokens' },
      { id: 's3-configuration', label: 'S3 Configuration', path: '/docs/file-storage/s3-configuration' },
      { id: 'thumbnail-generation', label: 'Thumbnail Generation', path: '/docs/file-storage/thumbnail-generation' },
      { id: 'storage-drivers', label: 'Storage Drivers', path: '/docs/file-storage/storage-drivers' },
    ],
  },
  {
    id: 'realtime',
    label: 'Realtime',
    path: '/docs/realtime',
    children: [
      { id: 'websocket', label: 'WebSocket', path: '/docs/realtime/websocket' },
      { id: 'sse', label: 'Server-Sent Events', path: '/docs/realtime/sse' },
      { id: 'subscription-channels', label: 'Subscription Channels', path: '/docs/realtime/subscription-channels' },
      { id: 'disconnect-cleanup', label: 'Disconnect Cleanup', path: '/docs/realtime/disconnect-cleanup' },
    ],
  },
  {
    id: 'migrations',
    label: 'Migrations',
    path: '/docs/migrations',
    children: [
      { id: 'directory-structure', label: 'Directory Structure', path: '/docs/migrations/directory-structure' },
      { id: 'migration-file-format', label: 'Migration File Format', path: '/docs/migrations/migration-file-format' },
      { id: 'running-migrations', label: 'Running Migrations', path: '/docs/migrations/running-migrations' },
      { id: 'rollback', label: 'Rollback', path: '/docs/migrations/rollback' },
    ],
  },
  {
    id: 'javascript-hooks',
    label: 'JavaScript Hooks',
    path: '/docs/javascript-hooks',
    children: [
      { id: 'available-hook-events', label: 'Available Hook Events', path: '/docs/javascript-hooks/available-hook-events' },
      { id: 'available-globals', label: 'Available Globals', path: '/docs/javascript-hooks/available-globals' },
      { id: 'examples', label: 'Examples', path: '/docs/javascript-hooks/examples' },
      { id: 'sandbox-limitations', label: 'Sandbox Limitations', path: '/docs/javascript-hooks/sandbox-limitations' },
    ],
  },
  {
    id: 'api-reference',
    label: 'API Reference',
    path: '/docs/api-reference',
    children: [
      { id: 'base-url', label: 'Base URL', path: '/docs/api-reference/base-url' },
      { id: 'authentication', label: 'Authentication', path: '/docs/api-reference/authentication' },
      { id: 'collections', label: 'Collections', path: '/docs/api-reference/collections' },
      { id: 'records', label: 'Records', path: '/docs/api-reference/records' },
      { id: 'auth', label: 'Auth', path: '/docs/api-reference/auth' },
      { id: 'admin', label: 'Admin', path: '/docs/api-reference/admin' },
      { id: 'files', label: 'Files', path: '/docs/api-reference/files' },
      { id: 'other', label: 'Other', path: '/docs/api-reference/other' },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    path: '/docs/configuration',
    children: [
      { id: 'settings-api', label: 'Settings API', path: '/docs/configuration/settings-api' },
      { id: 'smtp-configuration', label: 'SMTP Configuration', path: '/docs/configuration/smtp-configuration' },
      { id: 's3-configuration', label: 'S3 Configuration', path: '/docs/configuration/s3-configuration' },
      { id: 'ai-configuration', label: 'AI Configuration', path: '/docs/configuration/ai-configuration' },
      { id: 'rate-limiting', label: 'Rate Limiting', path: '/docs/configuration/rate-limiting' },
      { id: 'environment-variables', label: 'Environment Variables', path: '/docs/configuration/environment-variables' },
      { id: 'architecture-diagram', label: 'Architecture Diagram', path: '/docs/configuration/architecture-diagram' },
    ],
  },
  {
    id: 'torque',
    label: 'Torque',
    path: '/docs/torque',
    children: [
      { id: 'overview', label: 'Overview', path: '/docs/torque/overview' },
      { id: 'node-types', label: 'Node Types', path: '/docs/torque/node-types' },
      { id: 'exporting', label: 'Exporting Workflows', path: '/docs/torque/exporting' },
      { id: 'api-endpoints', label: 'API Endpoints', path: '/docs/torque/api-endpoints' },
    ],
  },
]
