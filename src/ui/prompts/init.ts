/**
 * Solarch CLI Init TUI Prompt Flow
 * Collects project initialization parameters interactively using @clack/prompts.
 */

import { intro, cancel } from '@clack/prompts'
import { promptText } from './text.js'
import { promptSelect } from './select.js'
import { promptMultiSelect } from './multiselect.js'
import { promptConfirm } from './confirm.js'
import { colors } from '../theme.js'
import { InitConfig } from '../../cmd/init/types.js'
import {
  DEFAULT_PROJECT_NAME,
  DEFAULT_RATE_LIMIT,
  DEFAULT_AI,
  DEFAULT_AUTH_PROVIDERS,
} from '../../cmd/init/defaults.js'
import { loadTemplate } from '../../templates/loader.js'
import { TemplateDefinition } from '../../templates/types.js'
import { MINIMAL_TEMPLATE } from '../../templates/definitions.js'

export interface PromptInitOptions {
  initialValues?: Omit<Partial<InitConfig>, 'template'> & { template?: string | TemplateDefinition }
  onCancel?: () => void
}

/**
 * Interactive TUI Prompt Flow for Project Scaffolding
 * Collects user choices via Clack prompts and returns a clean InitConfig.
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

  // 1. Template / Intent Selection
  let template: TemplateDefinition = MINIMAL_TEMPLATE
  let chosenTemplateName = typeof initial.template === 'string' ? initial.template : initial.template?.name

  if (!chosenTemplateName && !initial.template) {
    chosenTemplateName = await promptSelect<string>({
      message: 'What are you building?',
      options: [
        { value: 'api', label: 'API Backend', hint: 'REST API, auth, users & posts schema' },
        { value: 'saas', label: 'SaaS Application', hint: 'Organizations, OAuth2, audit logs & billing hooks' },
        { value: 'realtime', label: 'Realtime Application', hint: 'WebSocket/SSE subscriptions & event streaming' },
        { value: 'ai', label: 'AI Backend', hint: 'Embeddings, vector search & AI completions' },
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

  if (typeof initial.template === 'object' && initial.template !== null) {
    template = initial.template
  } else if (chosenTemplateName === 'custom' || chosenTemplateName === 'sqlite' || chosenTemplateName === 'postgres') {
    template = MINIMAL_TEMPLATE
  } else if (chosenTemplateName) {
    try {
      template = loadTemplate(chosenTemplateName)
    } catch {
      template = MINIMAL_TEMPLATE
    }
  }

  // 2. Project Name
  const name = await promptText({
    message: 'Project name',
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: initial.name || DEFAULT_PROJECT_NAME,
    initialValue: initial.name,
    onCancel: handleCancel,
  })

  // 3. Database Selection
  const defaultDb = template.recommendedDatabase || (initial.database === 'postgres' ? 'postgres' : 'sqlite')
  const database = await promptSelect<'sqlite' | 'postgres'>({
    message: 'Choose database engine',
    options: [
      {
        value: 'sqlite',
        label: 'SQLite (Embedded)',
        hint: 'Recommended for local development, zero-config WAL mode',
      },
      {
        value: 'postgres',
        label: 'PostgreSQL',
        hint: 'Enterprise relational database (requires connection URL)',
      },
    ],
    initialValue: defaultDb,
    onCancel: handleCancel,
  })

  // 4. PostgreSQL Database URL (conditional)
  let databaseUrl = initial.databaseUrl || ''
  if (database === 'postgres') {
    databaseUrl = await promptText({
      message: 'PostgreSQL connection URL',
      placeholder: 'postgres://postgres:password@localhost:5432/dbname',
      defaultValue: initial.databaseUrl,
      initialValue: initial.databaseUrl,
      validate: (val) => {
        if (!val || !val.trim()) {
          return 'DATABASE_URL is required for PostgreSQL.'
        }
      },
      onCancel: handleCancel,
    })
  }

  let authProviders = template.features.auth || DEFAULT_AUTH_PROVIDERS
  let rateLimit = template.features.rateLimit ?? DEFAULT_RATE_LIMIT
  let ai = template.features.ai ?? DEFAULT_AI

  // 5. Custom Stack Configuration (if chosenTemplateName === 'custom')
  if (chosenTemplateName === 'custom') {
    authProviders = await promptMultiSelect<string>({
      message: 'Select authentication providers',
      options: [
        { value: 'email', label: 'Email / Password', hint: 'Default built-in auth' },
        { value: 'google', label: 'Google OAuth2', hint: 'Social login' },
        { value: 'github', label: 'GitHub OAuth2', hint: 'Developer sign-in' },
        { value: 'discord', label: 'Discord OAuth2', hint: 'Community auth' },
      ],
      initialValues: initial.authProviders && initial.authProviders.length > 0
        ? initial.authProviders
        : DEFAULT_AUTH_PROVIDERS,
      required: false,
      onCancel: handleCancel,
    })

    rateLimit = await promptConfirm({
      message: 'Enable API rate limiting?',
      initialValue: initial.rateLimit !== undefined ? initial.rateLimit : DEFAULT_RATE_LIMIT,
      onCancel: handleCancel,
    })

    ai = await promptConfirm({
      message: 'Enable Solarch AI developer tools?',
      initialValue: initial.ai !== undefined ? initial.ai : DEFAULT_AI,
      onCancel: handleCancel,
    })
  }

  return {
    name,
    database,
    databaseUrl,
    authProviders,
    rateLimit,
    ai,
    template,
    force: initial.force,
    dir: initial.dir,
  }
}
