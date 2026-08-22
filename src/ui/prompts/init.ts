/**
 * Solarch CLI Init TUI Prompt Flow (Phase 1)
 *
 * Implements the 7-step ecosystem-aware decision sequence:
 * 1. Application Type
 * 2. Project Name
 * 3. Deployment Model
 * 4. Database Strategy & Recommendation (with "Why" reasons)
 * 5. SDK Selection (Multi-select composable + Desktop Runtime)
 * 6. Plugin Intent (Dashboard-oriented, zero-credentials)
 * 7. ProjectPlan construction
 */

import { intro, cancel, note } from '@clack/prompts'
import { promptText } from './text.js'
import { promptSelect } from './select.js'
import { promptMultiSelect } from './multiselect.js'
import { colors } from '../theme.js'
import { InitConfig } from '../../cmd/init/types.js'
import { DEFAULT_PROJECT_NAME } from '../../cmd/init/defaults.js'
import { loadTemplate } from '../../templates/loader.js'
import { TemplateDefinition } from '../../templates/types.js'
import { MINIMAL_TEMPLATE } from '../../templates/definitions.js'
import {
  ProjectIntent,
  ApplicationType,
  DeploymentModel,
  DesktopRuntime,
  RecommendationEngine,
  DatabaseEngine,
  DatabaseStrategy,
  SdkSelection,
  PluginSelection,
  ProjectPlan,
  ECOSYSTEM_SDKS,
} from '../../ecosystem/index.js'

export interface PromptInitOptions {
  initialValues?: Partial<InitConfig>
  onCancel?: () => void
}

/**
 * Interactive TUI Prompt Flow for Ecosystem-Aware Project Scaffolding
 */
export async function promptInit(options: PromptInitOptions = {}): Promise<InitConfig> {
  const initial = options.initialValues || {}

  let isCancelled = false
  const handleCancel = () => {
    isCancelled = true
    if (options.onCancel) {
      options.onCancel()
      return
    }
    cancel('Cancelled by user.')
    process.exit(0)
  }

  intro(colors.bold(colors.cyan('⚡ Create Solarch Application')))

  // 1. Application Type
  let appType: ApplicationType = (initial.plan?.intent.application || initial.template?.name as ApplicationType) || 'api'

  if (!initial.plan && !initial.template) {
    appType = await promptSelect<ApplicationType>({
      message: 'What are you building?',
      options: [
        { value: 'web', label: 'Web Application', hint: 'Browser application with REST API and auth' },
        { value: 'api', label: 'API Backend', hint: 'REST API, auth, users & posts schema' },
        { value: 'saas', label: 'SaaS Application', hint: 'Organizations, OAuth2, audit logs & billing hooks' },
        { value: 'realtime', label: 'Realtime Application', hint: 'WebSocket/SSE subscriptions & event streaming' },
        { value: 'ai', label: 'AI Application', hint: 'Backend for LLMs, embeddings, vector search & AI workloads' },
        { value: 'agent', label: 'Agent Application', hint: 'Backend/application designed around autonomous or tool-using agents' },
        { value: 'mobile', label: 'Mobile Application', hint: 'Mobile backend for React Native & Expo applications' },
        { value: 'desktop', label: 'Desktop Application', hint: 'Cross-platform desktop application backend' },
        { value: 'custom', label: 'Custom / Minimal', hint: 'Configure custom stack from scratch' },
      ],
      initialValue: 'api',
      onCancel: handleCancel,
    })
  }

  if (isCancelled) {
    return {
      name: initial.name || DEFAULT_PROJECT_NAME,
      database: 'sqlite',
      authProviders: ['email'],
      rateLimit: false,
      ai: false,
    }
  }

  // 2. Project Name
  const name = await promptText({
    message: 'Project name',
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: initial.name || DEFAULT_PROJECT_NAME,
    initialValue: initial.name,
    validate: (val) => {
      if (!val || val.trim().length === 0) return 'Project name cannot be empty.'
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(val)) {
        return 'Project name contains invalid characters. Use alphanumeric, dash, dot, or underscore.'
      }
    },
    onCancel: handleCancel,
  })

  // 3. Deployment Model
  let deployment: DeploymentModel = initial.deployment || 'local'
  deployment = await promptSelect<DeploymentModel>({
    message: 'Where will this application run?',
    options: [
      { value: 'local', label: 'Local', hint: 'Single-node local development & deployment' },
      { value: 'cloud', label: 'Cloud', hint: 'Cloud-hosted backend deployment' },
      { value: 'local_and_cloud', label: 'Local + Cloud', hint: 'SQLite for local development + PostgreSQL in cloud' },
    ],
    initialValue: deployment,
    onCancel: handleCancel,
  })

  // Pre-calculate recommendations based on intent
  const initialIntent = new ProjectIntent({
    application: appType,
    deployment,
  })
  const recs = RecommendationEngine.recommend(initialIntent)

  // 4. Database Strategy & Recommendation Display
  const recDbName = recs.database.value === 'postgres'
    ? `PostgreSQL${recs.databaseCapabilities.vector ? ' (+ pgvector)' : ''}`
    : recs.database.value === 'mongodb'
    ? 'MongoDB'
    : 'SQLite'

  note(
    `Recommended: ${colors.bold(colors.cyan(recDbName))}\nWhy: ${colors.dim(recs.database.reason)}`,
    'Database Recommendation'
  )

  const databaseEngine = await promptSelect<DatabaseEngine>({
    message: 'Choose database engine',
    options: [
      {
        value: 'sqlite',
        label: 'SQLite (Embedded)',
        hint: 'Zero-config local persistence, optimal single-node throughput (WAL mode)',
      },
      {
        value: 'postgres',
        label: 'PostgreSQL',
        hint: 'Enterprise relational database with pgvector & connection pooling',
      },
      {
        value: 'mongodb',
        label: 'MongoDB',
        hint: 'Document database for flexible JSON schemas',
      },
    ],
    initialValue: recs.database.value,
    onCancel: handleCancel,
  })

  // 5. SDK Selection (Multi-select composable) & Desktop Runtime
  let desktopRuntime: DesktopRuntime = 'unspecified'
  if (appType === 'desktop') {
    desktopRuntime = await promptSelect<DesktopRuntime>({
      message: 'Choose desktop runtime',
      options: [
        { value: 'electron', label: 'Electron', hint: 'TypeScript / Node environment' },
        { value: 'tauri', label: 'Tauri', hint: 'Rust backend + web frontend' },
      ],
      initialValue: 'electron',
      onCancel: handleCancel,
    })
  }

  // Pre-select recommended SDKs
  const recommendedSdkNames = recs.sdks.map(s => s.packageName)
  const sdkOptions = Object.values(ECOSYSTEM_SDKS).map(sdk => ({
    value: sdk.packageName,
    label: `${sdk.displayName} (${sdk.packageName})`,
    hint: sdk.description,
  }))

  if (recs.sdks.length > 0) {
    const sdkRecNotes = recs.sdks.map(r => `• ${colors.cyan(r.packageName)}: ${r.reason}`).join('\n')
    note(sdkRecNotes, 'SDK Recommendation')
  }

  const selectedSdks = await promptMultiSelect<string>({
    message: 'Select client SDKs (Optional)',
    options: sdkOptions,
    initialValues: recommendedSdkNames.length > 0 ? recommendedSdkNames : undefined,
    required: false,
    onCancel: handleCancel,
  })

  // 6. Plugin Intent (Credential-free, Dashboard-oriented)
  const pluginModeChoice = await promptSelect<'none' | 'later' | 'selected'>({
    message: 'Would you like to use Solarch plugins?',
    options: [
      { value: 'none', label: 'No plugins', hint: 'Standard Solarch core capabilities only' },
      { value: 'later', label: 'Configure plugins later from Dashboard', hint: 'Manage integrations via Dashboard' },
      { value: 'selected', label: 'Select plugins now', hint: 'Declare plugin requirements for project manifest' },
    ],
    initialValue: 'none',
    onCancel: handleCancel,
  })

  let selectedPlugins: string[] = []
  if (pluginModeChoice === 'selected') {
    selectedPlugins = await promptMultiSelect<string>({
      message: 'Select plugins to declare',
      options: [
        { value: 'stripe', label: 'Stripe Billing', hint: 'Subscriptions & payment webhooks' },
        { value: 'resend', label: 'Resend Email', hint: 'Transactional email dispatch' },
        { value: 'oauth-google', label: 'Google OAuth', hint: 'Social authentication' },
        { value: 'oauth-github', label: 'GitHub OAuth', hint: 'Developer authentication' },
      ],
      required: false,
      onCancel: handleCancel,
    })
  }

  // 7. Compose Final ProjectPlan
  const finalIntent = new ProjectIntent({
    application: appType,
    deployment,
    desktopRuntime,
    explicitChoices: {
      application: appType,
      deployment,
      database: databaseEngine !== recs.database.value ? databaseEngine : undefined,
      sdks: selectedSdks,
      desktopRuntime: appType === 'desktop' ? desktopRuntime : undefined,
      plugins: pluginModeChoice === 'selected' ? selectedPlugins : undefined,
    },
  })

  // Build DatabaseStrategy
  const dbTopology = deployment === 'local_and_cloud' && databaseEngine === 'postgres'
    ? 'sqlite_local_postgres_cloud'
    : databaseEngine === 'postgres'
    ? 'postgres_only'
    : databaseEngine === 'mongodb'
    ? 'mongodb_only'
    : 'sqlite_only'

  const hasVector = (appType === 'ai' || appType === 'agent') && databaseEngine === 'postgres'
  const dbStrategy = new DatabaseStrategy({
    engine: databaseEngine,
    topology: dbTopology,
    capabilities: { vector: hasVector },
    source: databaseEngine === recs.database.value ? 'recommendation' : 'user',
  })

  const sdkSelection = new SdkSelection({
    selected: selectedSdks,
    recommended: recs.sdks,
    source: 'user',
  })

  const pluginSelection = new PluginSelection({
    mode: pluginModeChoice,
    plugins: selectedPlugins,
  })

  // Resolve template definition for migrations/hooks baseline
  let template: TemplateDefinition = MINIMAL_TEMPLATE
  try {
    if (appType === 'saas' || appType === 'realtime' || appType === 'ai') {
      template = loadTemplate(appType)
    } else if (appType === 'api' || appType === 'web') {
      template = loadTemplate('api')
    } else {
      template = MINIMAL_TEMPLATE
    }
  } catch {
    template = MINIMAL_TEMPLATE
  }

  const plan = new ProjectPlan({
    identity: { name, dir: initial.dir || '.' },
    intent: finalIntent,
    database: dbStrategy,
    sdks: sdkSelection,
    plugins: pluginSelection,
    desktop: { runtime: desktopRuntime },
    generation: {
      templateBaseline: template.name,
      migrations: template.migrations.map(m => m.file),
      hooks: template.hooks ? template.hooks.map(h => h.file) : [],
    },
  })

  return {
    name,
    database: databaseEngine,
    databaseUrl: '',
    authProviders: template.features?.auth || ['email'],
    rateLimit: template.features?.rateLimit ?? true,
    ai: appType === 'ai' || appType === 'agent',
    template,
    force: initial.force,
    dir: initial.dir,
    plan,
    deployment,
    desktopRuntime,
    sdks: selectedSdks,
    plugins: selectedPlugins,
  }
}
