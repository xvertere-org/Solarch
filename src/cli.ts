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

const program = new Command()

const packageJsonPath = join(__dirname, '..', 'package.json')
let version = '0.1.0'
try {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  version = pkg.version
} catch { }

program
  .name('solarch')
  .description('Solarch - TypeScript backend-as-a-service')
  .version(version)

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

function getCliOptions(cmdOpts: any = {}): any {
  const root = program.opts()
  return {
    defaultDev: cmdOpts.dev ?? root.dev ?? false,
    defaultDataDir: cmdOpts.dir ?? cmdOpts.dataDir ?? root.dir ?? root.dataDir ?? './pb_data',
    dbProvider: cmdOpts.db ?? root.db,
    connectionString: cmdOpts.dbUrl ?? cmdOpts.databaseUrl ?? root.dbUrl ?? root.databaseUrl,
    dbDriver: cmdOpts.dbDriver ?? root.dbDriver,
    dbMode: cmdOpts.dbMode ?? root.dbMode,
    defaultQueryTimeout: parseInt(cmdOpts.queryTimeout ?? root.queryTimeout ?? cmdOpts.queryTimeout ?? root.queryTimeout ?? '30', 10),
    defaultEncryptionEnv: cmdOpts.encryptionEnv ?? root.encryptionEnv,
  }
}

program
  .command('serve')
  .description('start the server')
  .option('--port <number>', 'port number', '8090')
  .option('--hideStartBanner', 'hide start banner')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .option('--dir <path>', 'data directory')
  .action(async (opts) => {
    const config = getCliOptions(opts)
    config.hideStartBanner = opts.hideStartBanner
    config.port = opts.port
    await runServe(config)
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
  .action(async (opts) => {
    const config = getCliOptions(opts)
    await createSuperuser({
      ...config,
      email: opts.email,
      password: opts.password,
    })
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
  .action(async (email, password, opts) => {
    const config = getCliOptions(opts)
    await createSuperuser({
      ...config,
      email,
      password,
    })
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
  .action(async (opts) => {
    const config = getCliOptions(opts)
    await runMigrateUp(config)
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
  .action(async (count, opts) => {
    const config = getCliOptions(opts)
    await runMigrateDown(count, config)
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
  .action(async (opts) => {
    const config = getCliOptions(opts)
    await runMigrateStatus(config)
  })

migrate
  .command('create')
  .description('create a new migration file')
  .argument('<name>', 'migration name')
  .option('--dir <path>', 'migrations directory', './pb_migrations')
  .action(async (name, opts) => {
    await runMigrateCreate(name, opts)
  })

program
  .command('init')
  .description('scaffold a new Solarch project')
  .option('-y, --yes', 'accept default configuration without prompting')
  .option('--name <name>', 'project name (default: my-app)')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL (required for postgres)')
  .option('--auth <providers>', 'comma-separated auth providers (email, google, github, discord)')
  .option('--rate-limit <true|false>', 'enable/disable rate limiting (default: true)')
  .option('--ai <true|false>', 'enable/disable AI tools (default: false)')
  .option('--force', 'force scaffolding even if target directory is not empty')
  .option('--dir <path>', 'parent directory to create project in')
  .action(async (opts) => {
    const root = program.opts()
    const dir = opts.dir || root.dir || '.'
    await runInit({
      ...opts,
      dir,
    })
  })

program
  .command('doctor')
  .alias('check')
  .description('run diagnostic health checks on environment, config, database, and permissions')
  .option('--dir <path>', 'data directory')
  .option('--db <provider>', 'database provider (sqlite | postgres)')
  .option('--db-url <url>', 'database connection URL')
  .option('--database-url <url>', 'database connection URL alias')
  .option('--db-driver <driver>', 'database driver (postgres | neon)')
  .option('--db-mode <mode>', 'database mode (tcp | http | websocket)')
  .option('--json', 'output diagnostics report as JSON')
  .action(async (opts) => {
    const config = getCliOptions(opts)
    config.json = opts.json
    await runDoctor(config)
  })

program.parse(process.argv)
