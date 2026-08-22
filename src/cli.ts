#!/usr/bin/env node

import 'dotenv/config'
import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { runServe } from './cmd/serve.js'
import { createSuperuser } from './cmd/superuser.js'
import { runMigrateUp, runMigrateDown, runMigrateStatus, runMigrateCreate } from './cmd/migrate.js'
import { runInit } from './cmd/init.js'
import { runDoctor } from './cmd/doctor.js'
import { runInfo } from './cmd/info.js'
import { runStatus } from './cmd/status.js'
import { runEnvCheck, runEnvGenerate, runEnvShow } from './cmd/env/index.js'
import { runConfigShow, runConfigValidate, runConfigSet } from './cmd/config/index.js'
import {
  runInspectProject,
  runInspectDatabase,
  runInspectFeatures,
  runInspectDependencies,
} from './cmd/inspect/index.js'
import {
  runProjectPath,
  runProjectClean,
  runProjectReset,
  runProjectDiff,
  runProjectPull,
  runProjectPush,
} from './cmd/project/index.js'
import { runDev } from './cmd/dev/index.js'
import { runLogs } from './cmd/logs/index.js'
import { runRoutes } from './cmd/routes/index.js'
import {
  generateCollection,
  generateMigration,
  generateHook,
} from './cmd/generate/index.js'
import { runTemplateList, runTemplateInfo } from './cmd/template/index.js'
import { runLogin } from './cmd/auth/login.js'
import { runLogout } from './cmd/auth/logout.js'
import { runWhoami } from './cmd/auth/whoami.js'
import { runLink } from './cmd/auth/link.js'
import { runUnlink } from './cmd/auth/unlink.js'
import { runSync } from './cmd/sync.js'
import { runSdkList, runSdkAdd, runSdkRemove, runSdkSync } from './cmd/sdk/index.js'
import {
  runPluginList,
  runPluginInfo,
  runPluginAdd,
  runPluginRemove,
  runPluginEnable,
  runPluginDisable,
  runPluginSync,
} from './cmd/plugin/index.js'
import { runDbStatus, runDbProvision, runDbSync } from './cmd/db/index.js'
import {
  runDeploy,
  runDeployList,
  runDeployStatus,
  runDeployRollback,
  runDeployLogs,
} from './cmd/deploy/index.js'
import { runMetrics, runTraces, runAlerts } from './cmd/telemetry/index.js'
import {
  runServiceStatus,
  runServiceScale,
  runServiceTraffic,
  runServiceMaintenance,
} from './cmd/service/index.js'
import {
  runMcpTools,
  runMcpInspect,
  runMcpPermissions,
  runMcpAudit,
  runMcpServe,
} from './cmd/mcp/index.js'
import { resolveDir, resolveDatabaseOptions, resolveRuntimeOptions } from './cli/context.js'
import {
  formatGroupedHelp,
  handleUnknownCommand,
  handleCliError,
  printVersionDetails,
  runInteractiveLauncher,
} from './ui/index.js'

const program = new Command()

const packageJsonPath = join(__dirname, '..', 'package.json')
let version = '0.19.1'
try {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  version = pkg.version || version
} catch { }

program
  .name('solarch')
  .description('Solarch - Developer Backend Platform')
  .version(version)

// Custom Grouped Root Help Output
program.helpInformation = () => formatGroupedHelp(version)

program
  .option('--dev', 'enable dev mode')
  .option('--dir <path>', 'data directory', './pb_data')
  .option('--data-dir <path>', 'data directory alias')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .option('--query-timeout <seconds>', 'query timeout in seconds', '30')
  .option('--queryTimeout <seconds>', 'query timeout alias')
  .option('--encryptionEnv <env>', 'encryption environment variable')

function getCliOptions(cmdOpts: any = {}, cmd?: Command): any {
  const dbOpts = resolveDatabaseOptions(cmdOpts, cmd)
  const runtimeOpts = resolveRuntimeOptions(cmdOpts, cmd)
  const rawDir = cmdOpts.dir ?? cmdOpts.dataDir
  const resolvedDir = rawDir || (cmd ? resolveDir(cmdOpts, cmd, './pb_data') : program.opts()?.dir ?? './pb_data')
  return {
    defaultDev: runtimeOpts.dev,
    defaultDataDir: resolvedDir,
    dbProvider: dbOpts.db,
    connectionString: dbOpts.dbUrl,
    dbDriver: dbOpts.dbDriver,
    dbMode: dbOpts.dbMode,
    defaultQueryTimeout: runtimeOpts.queryTimeout,
    defaultEncryptionEnv: runtimeOpts.encryptionEnv,
  }
}

program
  .command('serve')
  .description('start the production server')
  .option('--port <number>', 'port number', '8090')
  .option('--hideStartBanner', 'hide start banner')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .option('--dir <path>', 'data directory')
  .action(async (opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      config.hideStartBanner = opts.hideStartBanner
      config.port = opts.port
      await runServe(config)
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('dev')
  .description('start the interactive development server with file watching and diagnostics')
  .option('--port <number>', 'server port (default: 8090)')
  .option('--dir <path>', 'project root directory')
  .option('--no-watch', 'disable filesystem watcher')
  .option('--verbose', 'enable verbose logging')
  .action(async (opts, cmd) => {
    try {
      await runDev({
        dir: resolveDir(opts, cmd),
        port: opts.port,
        watch: opts.watch,
        verbose: opts.verbose,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('logs')
  .description('view runtime application logs with filtering and streaming')
  .option('--env <environment>', 'target environment for remote platform logs (development|staging|production)')
  .option('--dir <path>', 'project root directory')
  .option('-f, --follow', 'continuously stream logs')
  .option('--level <level>', 'filter logs by level (DEBUG, INFO, WARN, ERROR)')
  .option('--tail <number>', 'number of recent log lines to display', '50')
  .option('--json', 'output logs as JSON array')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runLogs({
        dir: resolveDir(opts, cmd),
        env: opts.env,
        follow: opts.follow,
        level: opts.level,
        tail: opts.tail,
        json: opts.json,
        token: opts.token,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('routes')
  .description('explore REST routes, realtime subscriptions, and middleware')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output routes report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runRoutes({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const generateCmd = program
  .command('generate')
  .description('scaffold database collections, schema migrations, and hooks')

generateCmd
  .command('collection <name>')
  .description('scaffold a new database collection migration')
  .option('--dir <path>', 'project root directory')
  .option('--force', 'force overwriting existing file')
  .option('--json', 'output result as JSON')
  .action(async (name, opts, cmd) => {
    try {
      await generateCollection({
        name,
        dir: resolveDir(opts, cmd),
        force: opts.force,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

generateCmd
  .command('migration <name>')
  .description('scaffold a new schema migration file')
  .option('--dir <path>', 'project root directory')
  .option('--force', 'force overwriting existing file')
  .option('--json', 'output result as JSON')
  .action(async (name, opts, cmd) => {
    try {
      await generateMigration({
        name,
        dir: resolveDir(opts, cmd),
        force: opts.force,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

generateCmd
  .command('hook <name>')
  .description('scaffold a new application lifecycle hook')
  .option('--dir <path>', 'project root directory')
  .option('--force', 'force overwriting existing file')
  .option('--json', 'output result as JSON')
  .action(async (name, opts, cmd) => {
    try {
      await generateHook({
        name,
        dir: resolveDir(opts, cmd),
        force: opts.force,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('version')
  .description('display detailed version, runtime, and platform information')
  .action(() => {
    printVersionDetails(version)
    process.exit(0)
  })

program
  .command('superuser')
  .description('create superuser account')
  .option('--email <email>', 'superuser email')
  .option('--password <password>', 'superuser password')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .action(async (opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      await createSuperuser({
        ...config,
        email: opts.email,
        password: opts.password,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('superuser-create')
  .alias('superuser create')
  .description('create superuser account (shorthand: solarch superuser create EMAIL PASS)')
  .argument('[email]', 'superuser email')
  .argument('[password]', 'superuser password')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .action(async (email, password, opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      await createSuperuser({
        ...config,
        email,
        password,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const migrate = program
  .command('migrate')
  .description('manage database migrations')

migrate
  .command('up')
  .description('run pending migrations')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .action(async (opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      await runMigrateUp(config)
    } catch (err) {
      handleCliError(err)
    }
  })

migrate
  .command('down')
  .description('rollback migrations')
  .argument('[count]', 'number of migrations to rollback', '1')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .action(async (count, opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      await runMigrateDown(count, config)
    } catch (err) {
      handleCliError(err)
    }
  })

migrate
  .command('status')
  .description('show migration status')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .action(async (opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      await runMigrateStatus(config)
    } catch (err) {
      handleCliError(err)
    }
  })

migrate
  .command('create')
  .description('create a new migration file')
  .argument('<name>', 'migration name')
  .option('--dir <path>', 'migrations directory', './pb_migrations')
  .action(async (name, opts, cmd) => {
    try {
      await runMigrateCreate(name, { dir: resolveDir(opts, cmd, './pb_migrations') })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('init')
  .alias('create')
  .description('create a new Solarch project')
  .option('-y, --yes', 'accept default configuration without prompting')
  .option('--name <name>', 'project name (default: my-app)')
  .option('--app <type>', 'application type (web, api, saas, realtime, ai, agent, mobile, desktop, custom)')
  .option('--deployment <model>', 'deployment model (local, cloud, local_and_cloud)')
  .option('--desktop-runtime <runtime>', 'desktop runtime environment (electron, tauri)')
  .option('--template <template>', 'starter template (minimal, api, realtime, saas, ai)')
  .option('--preset <preset>', 'configuration preset (development, production, testing)')
  .option('--dry-run', 'preview scaffolding plan without modifying disk')
  .option('--db <provider>', 'database provider (sqlite | postgres | mongodb)')
  .option('--db-url <url>', 'database connection URL')
  .option('--auth <providers>', 'comma-separated auth providers (email, google, github, discord)')
  .option('--sdks <packages>', 'comma-separated client SDK packages')
  .option('--plugins <plugins>', 'comma-separated plugins to declare')
  .option('--rate-limit <true|false>', 'enable/disable rate limiting (default: true)')
  .option('--ai <true|false>', 'enable/disable AI tools (default: false)')
  .option('--force', 'force scaffolding even if target directory is not empty')
  .option('--dir <path>', 'parent directory to create project in')
  .action(async (opts, cmd) => {
    try {
      await runInit({
        ...opts,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const templateCmd = program
  .command('template')
  .description('explore and inspect backend starter architecture templates')

templateCmd
  .command('list')
  .description('list all available starter templates')
  .option('--json', 'output templates list as JSON')
  .action(async (opts) => {
    try {
      await runTemplateList({ json: opts.json })
    } catch (err) {
      handleCliError(err)
    }
  })

templateCmd
  .command('info <name>')
  .description('display detailed architecture and features of a template')
  .option('--json', 'output template info as JSON')
  .action(async (name, opts) => {
    try {
      await runTemplateInfo({ name, json: opts.json })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('doctor')
  .alias('check')
  .description('diagnose environment, config, database, and permissions problems')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .option('--json', 'output diagnostics report as JSON')
  .action(async (opts, cmd) => {
    try {
      const config = getCliOptions(opts, cmd)
      config.json = opts.json
      config.cwd = resolveDir(opts, cmd)
      await runDoctor(config)
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('info')
  .alias('about')
  .description('display static project information and metadata')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output info as JSON')
  .action(async (opts, cmd) => {
    try {
      await runInfo({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('status')
  .description('show runtime health, database, migrations, and superuser status')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output status as JSON')
  .action(async (opts, cmd) => {
    try {
      await runStatus({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const envCmd = program
  .command('env')
  .description('manage project environment configuration and secrets')

envCmd
  .command('check')
  .description('validate project environment configuration')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output check results as JSON')
  .action(async (opts, cmd) => {
    try {
      await runEnvCheck({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

envCmd
  .command('generate')
  .description('generate missing environment secrets safely')
  .option('--dir <path>', 'project root directory')
  .option('--force', 'force regeneration of existing secrets')
  .option('-y, --yes', 'skip confirmation in force mode')
  .option('--json', 'output generation results as JSON')
  .action(async (opts, cmd) => {
    try {
      await runEnvGenerate({
        dir: resolveDir(opts, cmd),
        force: opts.force,
        yes: opts.yes,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

envCmd
  .command('show')
  .description('display environment configuration safely')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output environment as JSON')
  .action(async (opts, cmd) => {
    try {
      await runEnvShow({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const configCmd = program
  .command('config')
  .description('manage and validate Solarch project configuration')

configCmd
  .command('show')
  .description('display effective resolved configuration')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output configuration as JSON')
  .action(async (opts, cmd) => {
    try {
      await runConfigShow({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

configCmd
  .command('validate')
  .description('validate project configuration before starting server')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output validation report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runConfigValidate({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

configCmd
  .command('set <key> <value>')
  .description('modify safe configuration values')
  .option('--dir <path>', 'project root directory')
  .action(async (key, value, opts, cmd) => {
    try {
      await runConfigSet({
        dir: resolveDir(opts, cmd),
        key,
        value,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const inspectCmd = program
  .command('inspect')
  .alias('ls')
  .description('inspect project configuration, database, features, and dependencies')

inspectCmd
  .command('project')
  .description('show project identity and runtime metadata')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output inspection report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runInspectProject({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

inspectCmd
  .command('database')
  .description('inspect database configuration, connection, and capabilities')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output database report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runInspectDatabase({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

inspectCmd
  .command('features')
  .description('inspect enabled features, authentication, and capabilities')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output features report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runInspectFeatures({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

inspectCmd
  .command('dependencies')
  .description('inspect runtime dependency compatibility and core client')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output dependencies report as JSON')
  .action(async (opts, cmd) => {
    try {
      await runInspectDependencies({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const projectCmd = program
  .command('project')
  .description('manage local project lifecycle, paths, cleanup, and state reset')

projectCmd
  .command('path')
  .description('show resolved project location and core directories')
  .option('--dir <path>', 'project root directory')
  .option('--json', 'output paths as JSON')
  .action(async (opts, cmd) => {
    try {
      await runProjectPath({
        dir: resolveDir(opts, cmd),
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

projectCmd
  .command('clean')
  .description('remove generated runtime artifacts (pb_data, coverage, logs, .tmp)')
  .option('--dir <path>', 'project root directory')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('--json', 'output clean results as JSON')
  .action(async (opts, cmd) => {
    try {
      await runProjectClean({
        dir: resolveDir(opts, cmd),
        yes: opts.yes,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

projectCmd
  .command('reset')
  .description('reset local runtime state and re-validate project')
  .option('--dir <path>', 'project root directory')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('--json', 'output reset results as JSON')
  .action(async (opts, cmd) => {
    try {
      await runProjectReset({
        dir: resolveDir(opts, cmd),
        yes: opts.yes,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

projectCmd
  .command('diff')
  .description('compare local manifest against remote Dashboard project configuration')
  .option('--env <environment>', 'target environment (development | staging | production)', 'development')
  .option('--json', 'output 3-way diff as JSON')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runProjectDiff({
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

projectCmd
  .command('pull')
  .description('pull remote project configuration and capabilities into local manifest and .env')
  .option('--env <environment>', 'target environment (development | staging | production)', 'development')
  .option('--force', 'overwrite conflicting local declarations with remote platform state')
  .option('--dry-run', 'preview changes without modifying files')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runProjectPull({
        env: opts.env,
        force: opts.force,
        dryRun: opts.dryRun,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

projectCmd
  .command('push')
  .description('push local capability intent to Dashboard with optimistic concurrency')
  .option('--dry-run', 'preview capability updates without pushing to remote')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runProjectPush({
        dryRun: opts.dryRun,
        yes: opts.yes,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('login')
  .description('authenticate machine with Solarch Platform')
  .option('--token <token>', 'authenticate directly via platform token (for CI / headless)')
  .option('--no-browser', 'do not attempt to automatically launch a web browser')
  .action(async (opts) => {
    try {
      await runLogin({
        token: opts.token,
        browser: opts.browser,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('logout')
  .description('log out and remove stored platform session credentials')
  .action(async () => {
    try {
      await runLogout()
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('whoami')
  .description('display current authenticated user, organization, and project linkage facts')
  .option('--json', 'output authentication facts as JSON')
  .option('--token <token>', 'evaluate credentials against an explicit token')
  .option('--dir <path>', 'directory to inspect for linked project')
  .action(async (opts, cmd) => {
    try {
      await runWhoami({
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('link')
  .description('link current local project to a remote Solarch Platform project')
  .option('--project <id>', 'remote project ID')
  .option('--org <id>', 'organization ID')
  .option('-y, --yes', 'skip interactive confirmation')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runLink({
        project: opts.project,
        org: opts.org,
        yes: opts.yes,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('unlink')
  .description('unlink current project from remote Solarch Platform project')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runUnlink({
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('sync')
  .description('synchronize project configuration and environment variables from Solarch Platform')
  .option('--env <environment>', 'target environment (development | staging | production)', 'development')
  .option('--dry-run', 'preview configuration and environment changes without modifying disk')
  .option('--force', 'overwrite conflicting local .env variables with remote platform values')
  .option('--json', 'output sync report as JSON')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runSync({
        env: opts.env,
        dryRun: opts.dryRun,
        force: opts.force,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const sdkCmd = program
  .command('sdk')
  .description('manage and provision Solarch client SDK packages')

sdkCmd
  .command('list')
  .description('list all available and installed Solarch SDK packages')
  .option('--json', 'output SDK list as JSON')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runSdkList({
        json: opts.json,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

sdkCmd
  .command('add <packages...>')
  .alias('install')
  .description('install one or more Solarch client SDK packages')
  .option('--manager <pm>', 'package manager to use (npm | pnpm | yarn | bun)')
  .option('-D, --dev', 'install as development dependency')
  .option('--dry-run', 'preview install command without modifying disk')
  .option('--dir <path>', 'project root directory')
  .action(async (packages, opts, cmd) => {
    try {
      await runSdkAdd({
        packages,
        manager: opts.manager,
        dev: opts.dev,
        dryRun: opts.dryRun,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

sdkCmd
  .command('remove <packages...>')
  .alias('uninstall')
  .description('uninstall one or more Solarch client SDK packages')
  .option('--manager <pm>', 'package manager to use (npm | pnpm | yarn | bun)')
  .option('--dir <path>', 'project root directory')
  .action(async (packages, opts, cmd) => {
    try {
      await runSdkRemove({
        packages,
        manager: opts.manager,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

sdkCmd
  .command('sync')
  .description('reconcile and install missing SDK dependencies declared in .solarch/project.json')
  .option('--manager <pm>', 'package manager to use (npm | pnpm | yarn | bun)')
  .option('--dry-run', 'preview required installations without running package manager')
  .option('-y, --yes', 'skip interactive confirmation prompt')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runSdkSync({
        manager: opts.manager,
        dryRun: opts.dryRun,
        yes: opts.yes,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const pluginCmd = program
  .command('plugin')
  .description('manage and discover ecosystem plugins')

pluginCmd
  .command('list')
  .description('list all available and installed ecosystem plugins')
  .option('--json', 'output plugin list as JSON')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runPluginList({
        json: opts.json,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('info <plugin>')
  .description('display detailed plugin information, configuration schema, and environment requirements')
  .option('--json', 'output plugin info as JSON')
  .action(async (plugin, opts) => {
    try {
      await runPluginInfo({
        plugin,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('add <plugins...>')
  .alias('install')
  .description('add one or more plugins to the project manifest (.solarch/project.json)')
  .option('--dry-run', 'preview plugin additions without modifying manifest')
  .option('--dir <path>', 'project root directory')
  .action(async (plugins, opts, cmd) => {
    try {
      await runPluginAdd({
        plugins,
        dryRun: opts.dryRun,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('remove <plugins...>')
  .alias('uninstall')
  .description('remove one or more plugins from the project manifest')
  .option('--dir <path>', 'project root directory')
  .action(async (plugins, opts, cmd) => {
    try {
      await runPluginRemove({
        plugins,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('enable <plugin>')
  .description('enable an installed plugin in the project manifest')
  .option('--dir <path>', 'project root directory')
  .action(async (plugin, opts, cmd) => {
    try {
      await runPluginEnable({
        plugin,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('disable <plugin>')
  .description('disable a plugin in the project manifest')
  .option('--dir <path>', 'project root directory')
  .action(async (plugin, opts, cmd) => {
    try {
      await runPluginDisable({
        plugin,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

pluginCmd
  .command('sync')
  .description('reconcile plugin requirements declared on Solarch Platform with local manifest')
  .option('--dry-run', 'preview plugin reconciliation without modifying manifest')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('--token <token>', 'explicit platform token')
  .option('--dir <path>', 'project root directory')
  .action(async (opts, cmd) => {
    try {
      await runPluginSync({
        dryRun: opts.dryRun,
        yes: opts.yes,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

const dbCmd = program
  .command('db')
  .description('database remote provisioning, topology synchronization, and status')

dbCmd
  .command('status')
  .description('display database topology, provider, and synchronization status')
  .option('--env <environment>', 'target environment (development, staging, production)', 'development')
  .option('--json', 'output database topology status as JSON')
  .option('--dir <path>', 'project root directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDbStatus({
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

dbCmd
  .command('provision')
  .description('provision a remote cloud database instance via Solarch Platform')
  .option('--env <environment>', 'target environment (development, staging, production)', 'development')
  .option('--provider <provider>', 'database provider (neon, supabase, atlas, custom)')
  .option('--topology <topology>', 'database topology (standalone, replica, serverless, sharded)')
  .option('--region <region>', 'target cloud deployment region')
  .option('--dry-run', 'preview database provisioning without modifying remote or local state')
  .option('--dir <path>', 'project root directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDbProvision({
        env: opts.env,
        provider: opts.provider,
        topology: opts.topology,
        region: opts.region,
        dryRun: opts.dryRun,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

dbCmd
  .command('sync')
  .description('reconcile remote database topology and provider configuration with local manifest')
  .option('--env <environment>', 'target environment (development, staging, production)', 'development')
  .option('--dry-run', 'preview topology reconciliation without modifying manifest')
  .option('-y, --yes', 'skip confirmation prompt')
  .option('--dir <path>', 'project root directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDbSync({
        env: opts.env,
        dryRun: opts.dryRun,
        yes: opts.yes,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

// Phase 7: Remote Deployments & Production Orchestration (solarch deploy)
const deployCmd = program
  .command('deploy')
  .description('Deploy project to cloud environments')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--provider <provider>', 'target deployment provider')
  .option('--dry-run', 'simulate packaging and deployment without remote mutation')
  .option('--allow-dirty', 'allow production deployment from dirty git tree')
  .option('--entrypoint <entrypoint>', 'custom entrypoint file')
  .option('--build-command <command>', 'custom build command')
  .option('--json', 'output deployment result as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDeploy({
        env: opts.env,
        provider: opts.provider,
        dryRun: opts.dryRun,
        allowDirty: opts.allowDirty,
        entrypoint: opts.entrypoint,
        buildCommand: opts.buildCommand,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

deployCmd
  .command('list')
  .description('List deployment history')
  .option('--env <environment>', 'target environment filter')
  .option('--json', 'output as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDeployList({
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

deployCmd
  .command('status [deploymentId]')
  .description('Check status of a deployment')
  .option('--env <environment>', 'target environment')
  .option('--json', 'output as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (deploymentId, opts, cmd) => {
    try {
      await runDeployStatus({
        deploymentId,
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

deployCmd
  .command('rollback')
  .description('Rollback active traffic to a previous healthy deployment')
  .requiredOption('--target <deploymentId>', 'target deployment ID to rollback to')
  .option('--env <environment>', 'target environment', 'development')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runDeployRollback({
        target: opts.target,
        env: opts.env,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

deployCmd
  .command('logs <deploymentId>')
  .description('Stream build and execution logs for a deployment')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (deploymentId, opts, cmd) => {
    try {
      await runDeployLogs({
        deploymentId,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

// Phase 8: Production Services, Telemetry & Observability
program
  .command('metrics')
  .description('Inspect runtime telemetry and performance metrics')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--window <ms>', 'aggregation window in milliseconds', '60000')
  .option('--json', 'output metrics as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runMetrics({
        env: opts.env,
        window: opts.window,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('traces [traceId]')
  .description('Inspect distributed request trace spans')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output trace spans as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (traceId, opts, cmd) => {
    try {
      await runTraces({
        traceId,
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

program
  .command('alerts')
  .description('View production alerts and health status')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output alerts as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runAlerts({
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

// Phase 9: Production Service Management, Health Monitoring & E2E Integration
const serviceCmd = program
  .command('service')
  .description('Manage production services, scaling, traffic, and maintenance')

serviceCmd
  .command('status')
  .description('Display unified production service dashboard and health metrics')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output status report as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runServiceStatus({
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

serviceCmd
  .command('scale')
  .description('Adjust compute instances and resource limits')
  .option('--instances <n>', 'number of compute instance replicas')
  .option('--memory <mb>', 'allocated memory in MB')
  .option('--cpu <milli>', 'allocated CPU in millicores')
  .option('--force', 'override configured scaling guardrails')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output scale result as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runServiceScale({
        instances: opts.instances,
        memory: opts.memory,
        cpu: opts.cpu,
        force: opts.force,
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

serviceCmd
  .command('traffic')
  .description('Manage traffic routing and staged canary progression')
  .option('--canary <deploymentId>', 'target canary deployment ID')
  .option('--weight <percent>', 'traffic percentage allocated to canary (0-100)')
  .option('--force', 'override staged canary progression')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output traffic allocation as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (opts, cmd) => {
    try {
      await runServiceTraffic({
        canary: opts.canary,
        weight: opts.weight,
        force: opts.force,
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

serviceCmd
  .command('maintenance <action>')
  .description('Toggle service maintenance mode (on|off)')
  .option('--message <msg>', 'custom maintenance message displayed to users')
  .option('--env <environment>', 'target environment (development|staging|production)', 'development')
  .option('--json', 'output maintenance state as JSON')
  .option('--dir <path>', 'target project directory')
  .option('--token <token>', 'explicit platform token')
  .action(async (action, opts, cmd) => {
    try {
      await runServiceMaintenance({
        action: action as 'on' | 'off',
        message: opts.message,
        env: opts.env,
        json: opts.json,
        token: opts.token,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

// Phase 10: MCP Integration & External Agent Tooling Layer
const mcpCmd = program
  .command('mcp')
  .description('Inspect, test, and govern MCP tools and capabilities for external AI agents')

mcpCmd
  .command('tools')
  .description('List all registered MCP tools with risk classifications and approval requirements')
  .option('--category <category>', 'filter tools by category (project, database, deployment, service, telemetry)')
  .option('--risk <risk>', 'filter tools by risk level (read, local_mutation, production_mutation, destructive)')
  .option('--json', 'output tool catalog as JSON')
  .action(async (opts) => {
    try {
      await runMcpTools({
        category: opts.category,
        risk: opts.risk,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

mcpCmd
  .command('inspect <toolName>')
  .description('Inspect detailed schema, risk level, and parameters for an MCP tool')
  .option('--json', 'output tool specification as JSON')
  .action(async (toolName, opts) => {
    try {
      await runMcpInspect({
        toolName,
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

mcpCmd
  .command('permissions')
  .description('Display MCP tool permission policies, risk tiers, and approval requirements')
  .option('--json', 'output permission matrix as JSON')
  .action(async (opts) => {
    try {
      await runMcpPermissions({
        json: opts.json,
      })
    } catch (err) {
      handleCliError(err)
    }
  })

mcpCmd
  .command('audit')
  .description('View append-only audit trail of external agent tool invocations')
  .option('--limit <n>', 'maximum number of audit entries to display', '20')
  .option('--json', 'output audit entries as JSON')
  .option('--dir <path>', 'target project directory')
  .action(async (opts, cmd) => {
    try {
      await runMcpAudit({
        limit: opts.limit ? parseInt(opts.limit, 10) : 20,
        json: opts.json,
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

mcpCmd
  .command('serve')
  .description('Start local stdio bridge for MCP clients and @solarch/mcp-server')
  .option('--dir <path>', 'target project directory')
  .action(async (opts, cmd) => {
    try {
      await runMcpServe({
        dir: resolveDir(opts, cmd),
      })
    } catch (err) {
      handleCliError(err)
    }
  })

// Unknown command listener with Levenshtein typo suggestion
program.on('command:*', (operands) => {
  const unknownCmd = operands[0]
  handleUnknownCommand(unknownCmd)
})

// Dispatch interactive launcher or CLI arguments
if (process.argv.length <= 2) {
  if (process.stdin.isTTY && !process.env.CI) {
    (async () => {
      try {
        const choice = await runInteractiveLauncher()
        if (choice) {
          switch (choice) {
            case 'init':
              await runInit({ dir: '.' })
              break
            case 'dev':
              await runDev({})
              break
            case 'serve':
              await runServe(getCliOptions())
              break
            case 'logs':
              await runLogs({ dir: '.' })
              break
            case 'routes':
              await runRoutes({ dir: '.' })
              break
            case 'generate':
              console.log('\nRun one of:')
              console.log('  solarch generate collection <name>')
              console.log('  solarch generate migration <name>')
              console.log('  solarch generate hook <name>\n')
              break
            case 'doctor':
              await runDoctor({ silent: false })
              break
            case 'status':
              await runStatus({})
              break
            case 'config':
              await runConfigShow({})
              break
            case 'env':
              await runEnvShow({})
              break
            case 'inspect':
              await runInspectProject({})
              break
            case 'project':
              await runProjectPath({})
              break
            case 'migrate':
              await runMigrateStatus(getCliOptions())
              break
            case 'superuser':
              await createSuperuser(getCliOptions())
              break
            case 'login':
              await runLogin({})
              break
            case 'logout':
              await runLogout({})
              break
            case 'whoami':
              await runWhoami({})
              break
            case 'link':
              await runLink({})
              break
            case 'unlink':
              await runUnlink({})
              break
            case 'sync':
              await runSync({})
              break
            case 'sdk':
              await runSdkList({})
              break
            case 'plugin':
              await runPluginList({})
              break
            case 'db':
              await runDbStatus({})
              break
            case 'deploy':
              await runDeploy({})
              break
            case 'metrics':
              await runMetrics({})
              break
            case 'traces':
              await runTraces({})
              break
            case 'alerts':
              await runAlerts({})
              break
            case 'service':
              await runServiceStatus({})
              break
            case 'mcp':
              await runMcpTools({})
              break
            case 'version':
              printVersionDetails(version)
              break
            default:
              console.log(formatGroupedHelp(version))
              break
          }
        }
      } catch (err) {
        handleCliError(err)
      }
    })()
  } else {
    console.log(formatGroupedHelp(version))
  }
} else {
  program.parse(process.argv)
}
