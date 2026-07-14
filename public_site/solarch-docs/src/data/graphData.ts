// Extracted from /public_site/graphify-out/graph.json and GRAPH_REPORT.md
// Maps each documentation section to its related code graph data

export interface GraphCommunity {
  id: number
  name: string
  cohesion: number
  nodeCount: number
  keyNodes: string[]
}

export interface GraphFile {
  path: string
  nodeCount: number
  keyFunctions: string[]
}

export interface GraphHyperedge {
  id: string
  label: string
  nodes: string[]
  confidence: string
}

export const communities: GraphCommunity[] = [
  { id: 0, name: 'Admin Dashboard & API Routes', cohesion: 0.03, nodeCount: 57, keyNodes: ['registerAdminAuthRoutes()', 'registerAIRoutes()', 'sendMessage()', 'registerEmailChangeRoutes()', 'registerImpersonateRoutes()', 'registerPasswordResetRoutes()', 'registerVerificationRoutes()', 'registerBackupRoutes()'] },
  { id: 1, name: 'Database & Auth Core', cohesion: 0.04, nodeCount: 53, keyNodes: ['down()', 'up()', 'deleteAllAuthOriginsByRecord()', 'deleteAllMFAsByRecord()', 'deleteAllOTPsByRecord()', 'deleteExpiredMFAs()', 'deleteExpiredOTPs()', 'findAllAuthOriginsByCollection()'] },
  { id: 2, name: 'Background Jobs & Event Broker', cohesion: 0.04, nodeCount: 28, keyNodes: ['processBatchRequest()', 'routeBatchRequest()', 'registerCronJob()', 'Hook', 'TaggedHook'] },
  { id: 4, name: 'Data Models & Validation', cohesion: 0.04, nodeCount: 17, keyNodes: ['evaluateFilterAST()', 'constructor()', 'generateId()', 'isNew()', 'markAsNew()', 'markAsNotNew()', 'AnthropicProvider', 'createLLMProvider()'] },
  { id: 5, name: 'Authentication Models', cohesion: 0.04, nodeCount: 21, keyNodes: ['AuthOrigin', 'ExternalAuth', 'MFA', 'OTP', 'AppleProvider', 'exchangeCode()', 'fetchRawUser()', 'getAuthUrl()'] },
  { id: 6, name: 'Field Types & Schema', cohesion: 0.04, nodeCount: 16, keyNodes: ['AutoDateField', 'BoolField', 'DateField', 'EditorField', 'EmailField', 'FileField', 'generateFieldId()'] },
  { id: 10, name: 'Documentation & Metadata', cohesion: 0.08, nodeCount: 32, keyNodes: ['Solarch Admin UI source', 'Migration down function', 'Migration file format', 'Migration up function', 'AI development tools', 'API access rules', 'Authentication system'] },
  { id: 11, name: 'Collection Management', cohesion: 0.12, nodeCount: 11, keyNodes: ['Collection', 'generateThumbnails()', 'Logger', 'buildExpectedColumns()', 'createRecordTable()', 'getExistingColumns()', 'getSQLiteType()'] },
  { id: 16, name: 'Record Field Resolution', cohesion: 0.17, nodeCount: 8, keyNodes: ['compareValues()', 'evaluateExpression()', 'evaluateRule()', 'haversineDistance()', 'RecordFieldResolver', 'resolveValue()', 'splitByOperator()'] },
  { id: 17, name: 'File Storage Driver', cohesion: 0.1, nodeCount: 2, keyNodes: ['LocalBlobDriver', 'Filesystem'] },
  { id: 22, name: 'Settings Security', cohesion: 0.32, nodeCount: 6, keyNodes: ['decryptSettings()', 'encryptSettings()', 'getNestedValue()', 'isEncrypted()', 'setNestedValue()', 'SettingsEncryption'] },
  { id: 25, name: 'String Inflection', cohesion: 0.31, nodeCount: 4, keyNodes: ['dasherize()', 'humanize()', 'titleize()', 'underscore()'] },
  { id: 26, name: 'Email System', cohesion: 0.33, nodeCount: 1, keyNodes: ['Mailer'] },
  { id: 28, name: 'JavaScript VM', cohesion: 0.43, nodeCount: 1, keyNodes: ['JSVM'] },
]

export const hyperedges: GraphHyperedge[] = [
  { id: 'auth_system', label: 'Authentication system', nodes: ['readme_authentication', 'readme_oauth2', 'readme_otp', 'readme_mfa_totp', 'readme_jwt_tokens'], confidence: 'EXTRACTED' },
  { id: 'ai_tools_suite', label: 'AI development tools suite', nodes: ['scope_ai_ai_schema_generator', 'scope_ai_ai_rule_translator', 'scope_ai_ai_data_seeder', 'scope_ai_ai_admin_assistant', 'scope_ai_llm_provider_interface'], confidence: 'EXTRACTED' },
  { id: 'admin_ui_delivery', label: 'Admin UI build and delivery pipeline', nodes: ['readme_react_admin_ui', 'admin_index_solarch_admin_ui', 'pb_public_admin_index_solarch_admin_ui'], confidence: 'INFERRED' },
]

export const sourceFiles: Record<string, GraphFile> = {
  'getting-started': {
    path: 'src/cli.ts, src/solarch.ts, src/cmd/superuser.ts',
    nodeCount: 34,
    keyFunctions: ['solarch.start()', 'solarch.migrate()', 'solarch.migratedown()', 'solarch.migrationstatus()', 'superuser.create()'],
  },
  'authentication': {
    path: 'src/core/auth_models.ts, src/core/auth_queries.ts, src/tools/auth/oauth2.ts, src/tools/auth/base_provider.ts, src/apis/record_auth.ts, src/apis/auth_flows.ts, src/apis/admin_auth.ts',
    nodeCount: 129,
    keyFunctions: ['exchangeCode()', 'fetchRawUser()', 'getAuthUrl()', 'deleteAllAuthOriginsByRecord()', 'deleteAllMFAsByRecord()', 'deleteAllOTPsByRecord()'],
  },
  'collections': {
    path: 'src/core/collection.ts, src/core/field.ts, src/core/record.ts, src/core/schema_sync.ts, src/core/record_query.ts, src/core/record_upsert.ts, src/core/record_field_resolver.ts, src/apis/collection.ts, src/apis/record_crud.ts',
    nodeCount: 412,
    keyFunctions: ['Collection', 'generateFieldId()', 'buildExpectedColumns()', 'createRecordTable()', 'getSQLiteType()', 'evaluateFilterAST()', 'resolveValue()'],
  },
  'ai-tools': {
    path: 'src/ai/provider.ts, src/ai/service.ts, src/apis/ai.ts',
    nodeCount: 60,
    keyFunctions: ['createLLMProvider()', 'AnthropicProvider', 'sendMessage()'],
  },
  'vector-search': {
    path: 'src/core/record_query.ts, src/tools/search/filter.ts',
    nodeCount: 107,
    keyFunctions: ['evaluateFilterAST()', 'haversineDistance()'],
  },
  'file-storage': {
    path: 'src/tools/filesystem/filesystem.ts, src/tools/filesystem/s3_driver.ts, src/tools/filesystem/blob/driver.ts, src/apis/file.ts',
    nodeCount: 83,
    keyFunctions: ['LocalBlobDriver', 'Filesystem', 'generateThumbnails()'],
  },
  'realtime': {
    path: 'src/tools/subscriptions/broker.ts, src/apis/realtime.ts',
    nodeCount: 53,
    keyFunctions: ['setupWebSocketRealtime()'],
  },
  'migrations': {
    path: 'src/core/migration.ts, src/solarch.ts, pb_migrations/1699900000000_example.js',
    nodeCount: 36,
    keyFunctions: ['up()', 'down()', 'solarch.migrate()', 'solarch.migratedown()'],
  },
  'javascript-hooks': {
    path: 'src/tools/jsvm/jsvm.ts, src/tools/hook/hook.ts, src/core/events.ts',
    nodeCount: 47,
    keyFunctions: ['JSVM', 'Hook', 'TaggedHook'],
  },
  'api-reference': {
    path: 'src/apis/serve.ts, src/apis/record_crud.ts, src/apis/record_auth.ts, src/apis/collection.ts, src/apis/file.ts, src/apis/ai.ts, src/apis/batch.ts, src/apis/backup.ts, src/apis/settings.ts, src/apis/realtime.ts, src/apis/admin_auth.ts, src/apis/health.ts, src/apis/logs.ts',
    nodeCount: 280,
    keyFunctions: ['serve()', 'processBatchRequest()', 'routeBatchRequest()'],
  },
  'configuration': {
    path: 'src/core/settings.ts, src/core/settings_encrypt.ts, src/apis/settings.ts',
    nodeCount: 17,
    keyFunctions: ['decryptSettings()', 'encryptSettings()', 'getNestedValue()', 'setNestedValue()', 'SettingsEncryption'],
  },
}

export const godNodes = [
  { name: 'DB', edges: 60, description: 'Database connection and dual-DB orchestration' },
  { name: 'C()', edges: 59, description: 'Core collection accessor / factory' },
  { name: 'dp()', edges: 47, description: 'Data provider / pagination helper' },
  { name: 'serve()', edges: 30, description: 'Express server bootstrap and middleware mounting' },
  { name: 'BaseApp', edges: 23, description: 'Base application class with hooks, DB, and settings' },
  { name: 'RecordModel', edges: 20, description: 'Record model with validation and expansion' },
]
