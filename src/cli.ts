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
  .option('--dir <path>', 'project root directory')
  .option('-f, --follow', 'continuously stream logs')
  .option('--level <level>', 'filter logs by level (DEBUG, INFO, WARN, ERROR)')
  .option('--tail <number>', 'number of recent log lines to display', '50')
  .option('--json', 'output logs as JSON array')
  .action(async (opts, cmd) => {
    try {
      await runLogs({
        dir: resolveDir(opts, cmd),
        follow: opts.follow,
        level: opts.level,
        tail: opts.tail,
        json: opts.json,
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
  .option('--template <template>', 'starter template (minimal, api, realtime, saas, ai)')
  .option('--preset <preset>', 'configuration preset (development, production, testing)')
  .option('--dry-run', 'preview scaffolding plan without modifying disk')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL (required for postgres)')
  .option('--auth <providers>', 'comma-separated auth providers (email, google, github, discord)')
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
