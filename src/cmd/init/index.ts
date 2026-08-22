/**
 * Solarch CLI Init Command Orchestrator (Init Experience Phase 1)
 * Coordinates ecosystem intent resolution, recommendations, prompt interaction, pre-flight validation, and filesystem generation.
 */

import { InitOptions, InitConfig, GenerationResult } from './types.js'
import {
  DEFAULT_PROJECT_NAME,
  DEFAULT_DATABASE,
  DEFAULT_RATE_LIMIT,
  DEFAULT_AI,
} from './defaults.js'
import {
  validateProjectName,
  validateDatabase,
  validateDatabaseUrl,
  validateAuthProviders,
  parseBoolean,
} from './validation.js'
import { generateProjectFiles } from './generator.js'
import { runDoctor } from '../doctor.js'
import * as promptsInit from '../../ui/prompts/init.js'
import * as promptsReview from '../../ui/prompts/review.js'
import { spinner } from '../../ui/index.js'
import { loadTemplate, loadPreset } from '../../templates/loader.js'
import { TemplateDefinition } from '../../templates/types.js'
import { MINIMAL_TEMPLATE } from '../../templates/definitions.js'
import { colors } from '../../ui/theme.js'
import {
  ProjectIntent,
  ApplicationType,
  DeploymentModel,
  RecommendationEngine,
  ProjectPlan,
} from '../../ecosystem/index.js'

export * from './types.js'
export * from './defaults.js'
export * from './validation.js'
export * from './generator.js'

/**
 * Main command handler for `solarch init`
 */
export async function runInit(opts: InitOptions = {}): Promise<GenerationResult | void> {
  const isInteractive = Boolean(
    !opts.yes &&
    process.stdin.isTTY &&
    process.env.CI !== 'true' &&
    !opts.dryRun
  )

  // 1. Preset Resolution
  let presetDb: string | undefined
  let presetRateLimit: boolean | undefined
  let presetAi: boolean | undefined

  if (opts.preset) {
    const preset = loadPreset(opts.preset)
    presetDb = preset.database
    presetRateLimit = preset.rateLimit
    presetAi = preset.ai
  }

  // 2. Template / App Resolution
  let template: TemplateDefinition = MINIMAL_TEMPLATE
  if (opts.template) {
    template = loadTemplate(opts.template)
  }

  let name = opts.name !== undefined ? opts.name : DEFAULT_PROJECT_NAME
  const rawAppType = opts.app || (opts.template as ApplicationType) || 'api'
  const deployment: DeploymentModel = opts.deployment || 'local'
  let dbType = opts.db || presetDb || (opts.template === 'saas' ? 'postgres' : DEFAULT_DATABASE)
  let dbUrl = opts.dbUrl || ''
  if (dbType === 'postgres' && !dbUrl && (opts.preset === 'production' || (opts.template === 'saas' && opts.db === 'postgres'))) {
    dbUrl = `postgres://solarch:password@localhost:5432/${name}`
  }
  let authProviders = opts.auth ? validateAuthProviders(opts.auth) : (template.features.auth || ['email'])
  let enableRateLimit = opts.rateLimit !== undefined
    ? parseBoolean(opts.rateLimit, DEFAULT_RATE_LIMIT, 'rate-limit')
    : (presetRateLimit ?? template.features.rateLimit ?? DEFAULT_RATE_LIMIT)
  let enableAi = opts.ai !== undefined
    ? parseBoolean(opts.ai, DEFAULT_AI, 'ai')
    : (presetAi ?? template.features.ai ?? DEFAULT_AI)

  let plan: ProjectPlan | undefined

  if (isInteractive) {
    const collected = await promptsInit.promptInit({
      initialValues: {
        name,
        database: (dbType === 'postgres' ? 'postgres' : dbType === 'mongodb' ? 'mongodb' : 'sqlite'),
        databaseUrl: dbUrl,
        authProviders,
        rateLimit: enableRateLimit,
        ai: enableAi,
        template: opts.template ? template : undefined,
        force: opts.force,
        dir: opts.dir,
        deployment,
      },
    })
    name = collected.name
    dbType = collected.database
    dbUrl = collected.databaseUrl || ''
    authProviders = collected.authProviders
    enableRateLimit = collected.rateLimit
    enableAi = collected.ai
    plan = collected.plan
    if (collected.template) {
      template = collected.template
    }
  } else {
    // Non-interactive mode: Construct deterministic ProjectPlan
    const explicitSdks = opts.sdks ? (Array.isArray(opts.sdks) ? opts.sdks : [opts.sdks]) : undefined
    const explicitPlugins = opts.plugins ? (Array.isArray(opts.plugins) ? opts.plugins : [opts.plugins]) : undefined
    const explicitDb = opts.db || presetDb || (opts.template === 'saas' ? 'postgres' : undefined)

    const intent = new ProjectIntent({
      application: rawAppType,
      deployment,
      desktopRuntime: opts.desktopRuntime || 'unspecified',
      features: {
        auth: authProviders,
        rateLimit: enableRateLimit,
        ai: enableAi,
        realtime: true,
        storage: true,
      },
      explicitChoices: {
        application: opts.app ? rawAppType : undefined,
        deployment: opts.deployment ? deployment : undefined,
        database: explicitDb,
        sdks: explicitSdks,
        plugins: explicitPlugins,
        desktopRuntime: opts.desktopRuntime,
      },
    })

    plan = RecommendationEngine.createPlan(
      { name, dir: opts.dir || '.' },
      intent
    )
    dbType = plan.database.engine
    enableAi = intent.features.ai
    enableRateLimit = intent.features.rateLimit
  }

  // --- Pre-flight Validation ---
  const validName = validateProjectName(name)
  const validDbType = validateDatabase(dbType)
  const validDbUrl = validateDatabaseUrl(validDbType, dbUrl, false)
  const validAuthProviders = validateAuthProviders(authProviders)

  const config: InitConfig = {
    name: validName,
    database: validDbType,
    databaseUrl: validDbUrl,
    dbSetup: opts.dbSetup || 'local',
    capabilities: opts.capabilities ? (Array.isArray(opts.capabilities) ? opts.capabilities : [opts.capabilities]) : undefined,
    authProviders: validAuthProviders,
    rateLimit: enableRateLimit,
    ai: enableAi,
    template,
    dryRun: opts.dryRun,
    force: opts.force,
    dir: opts.dir || '.',
    plan,
    deployment,
  }

  // --- Interactive Review Confirmation ---
  if (isInteractive) {
    const confirmed = await promptsReview.promptReview(config)
    if (!confirmed) {
      return
    }
  }

  // --- Dry-Run Mode ---
  if (opts.dryRun) {
    const result = generateProjectFiles(config, opts.dir || '.')
    console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Project Preview (Dry Run)'))}\n`)
    console.log(`Will create:\n`)
    console.log(`${colors.bold(config.name)}/`)
    for (const f of result.filesCreated) {
      console.log(`  ├── ${f}`)
    }
    console.log(`\n${colors.dim('No files created.')}\n`)

    if (opts.exitOnComplete ?? true) {
      process.exit(0)
    }
    return result
  }

  // --- Generate Filesystem Artifacts With Clack Spinner Feedback ---
  const s = spinner()
  let result: GenerationResult
  try {
    result = generateProjectFiles(config, opts.dir || '.', {
      onFoldersStart: () => s.start('Creating project structure'),
      onFoldersEnd: () => s.stop('Project structure ready'),
      onSecretsStart: () => s.start('Generating cryptographic secrets'),
      onSecretsEnd: () => s.stop('Secrets generated'),
      onConfigStart: () => s.start('Writing configuration & migrations'),
      onConfigEnd: () => s.stop('Configuration and migrations created'),
      onValidationStart: () => s.start('Running health diagnostics'),
      onValidationEnd: () => {},
    })

    // --- Run Internal Doctor Diagnostics on Generated Project ---
    const doctorReport = await runDoctor({
      cwd: result.projectDir,
      silent: true,
      exitOnComplete: false,
    })

    const failedChecks = doctorReport.checks.filter(c => {
      if (c.status !== 'fail') return false
      // For PostgreSQL or MongoDB projects, external database container is scaffolded but not running during local init
      if (c.id === 'database_connectivity' && (config.database === 'postgres' || config.database === 'mongodb')) {
        return false
      }
      return true
    })

    if (failedChecks.length > 0) {
      const errorMsg = failedChecks.map(c => `${c.name}: ${c.message}`).join(', ')
      throw new Error(`Project generation failed validation. ${errorMsg}`)
    }

    s.stop('Health check passed')
  } catch (err: any) {
    s.stop(`Failed: ${err.message || 'Project generation failed validation.'}`)
    throw err
  }

  // --- Target Final Output Format ---
  console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Project Created'))}\n`)
  console.log(`  ${colors.green('✔')} Configuration generated`)
  console.log(`  ${colors.green('✔')} Secrets generated`)

  if (config.database === 'sqlite') {
    console.log(`  ${colors.green('✔')} Local SQLite database initialized (./pb_data)`)
  } else if (config.database === 'postgres') {
    if (config.dbSetup === 'linked') {
      console.log(`  ${colors.green('✔')} PostgreSQL database requirement registered`)
      console.log(`  ${colors.dim('  Connect with: solarch db provision')}`)
    } else if (config.dbSetup === 'later') {
      console.log(`  ${colors.green('✔')} PostgreSQL requirement registered`)
      console.log(`  ${colors.dim('  Connect via Solarch Platform: solarch login')}`)
    } else {
      console.log(`  ${colors.green('✔')} PostgreSQL configuration & docker-compose.yml generated`)
      console.log(`  ${colors.dim('  Start local database: docker compose up -d')}`)
    }
  } else if (config.database === 'mongodb') {
    if (config.dbSetup === 'linked') {
      console.log(`  ${colors.green('✔')} MongoDB database requirement registered`)
      console.log(`  ${colors.dim('  Connect with: solarch db provision')}`)
    } else if (config.dbSetup === 'later') {
      console.log(`  ${colors.green('✔')} MongoDB requirement registered`)
      console.log(`  ${colors.dim('  Connect via Solarch Platform: solarch login')}`)
    } else {
      console.log(`  ${colors.green('✔')} MongoDB configuration & docker-compose.yml generated`)
      console.log(`  ${colors.dim('  Start local database: docker compose up -d')}`)
    }
  }

  console.log(`  ${colors.green('✔')} Migrations ready`)
  console.log(`  ${colors.green('✔')} Local ecosystem manifest created (.solarch/project.json)`)
  console.log(`  ${colors.green('✔')} Health check passed\n`)

  console.log(`Project:\n`)
  console.log(`  ${colors.bold(result.projectName)}\n`)

  console.log(`Next:\n`)
  console.log(`  cd ${result.projectName}`)
  if (config.database !== 'sqlite' && (!config.dbSetup || config.dbSetup === 'local')) {
    console.log(`  docker compose up -d`)
  }
  console.log(`  solarch dev\n`)

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
