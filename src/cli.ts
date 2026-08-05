#!/usr/bin/env node

import 'dotenv/config'
import { Command } from 'commander'
import { Solarch } from './solarch'
import { readFileSync } from 'fs'
import { join } from 'path'

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
  .option('--encryptionEnv <env>', 'encryption environment variable')
  .option('--queryTimeout <seconds>', 'query timeout in seconds', '30')

program
  .command('serve')
  .description('start the server')
  .option('--port <number>', 'port number', '8090')
  .option('--hideStartBanner', 'hide start banner')
  .action(async (opts) => {
    const dev = program.opts().dev ?? false
    const dataDir = program.opts().dir ?? './pb_data'
    const encryptionEnv =
      program.opts().encryptionEnv ||
      process.env.SETTINGS_ENCRYPTION_KEY
    const queryTimeout = parseInt(program.opts().queryTimeout, 10)

    const app = new Solarch({
      hideStartBanner: opts.hideStartBanner,
      defaultDev: dev,
      defaultDataDir: dataDir,
      defaultEncryptionEnv: encryptionEnv,
      defaultQueryTimeout: queryTimeout,
    })

    await app.start(parseInt(opts.port, 10))
  })

program
  .command('superuser')
  .description('create superuser account')
  .option('--email <email>', 'superuser email')
  .option('--password <password>', 'superuser password')
  .option('--dir <path>', 'data directory', './pb_data')
  .action(async (opts) => {
    const { createSuperuser } = await import('./cmd/superuser.js')
    await createSuperuser({
      email: opts.email,
      password: opts.password,
      dataDir: opts.dir,
    })
  })

program
  .command('superuser-create')
  .alias('superuser create')
  .description('create superuser account (shorthand: solarch superuser create EMAIL PASS)')
  .argument('[email]', 'superuser email')
  .argument('[password]', 'superuser password')
  .option('--dir <path>', 'data directory', './pb_data')
  .action(async (email, password, opts) => {
    const { createSuperuser } = await import('./cmd/superuser.js')
    await createSuperuser({
      email,
      password,
      dataDir: opts.dir,
    })
  })

const migrate = program
  .command('migrate')
  .description('manage database migrations')

migrate
  .command('up')
  .description('run pending migrations')
  .option('--dir <path>', 'data directory', './pb_data')
  .action(async (opts) => {
    const { Solarch } = await import('./solarch.js')
    const app = new Solarch({
      defaultDev: false,
      defaultDataDir: opts.dir,
    })
    await app.bootstrap()
    await app.migrate()
    console.log('Migrations completed.')
    process.exit(0)
  })

migrate
  .command('down')
  .description('rollback migrations')
  .argument('[count]', 'number of migrations to rollback', '1')
  .option('--dir <path>', 'data directory', './pb_data')
  .action(async (count, opts) => {
    const { Solarch } = await import('./solarch.js')
    const app = new Solarch({
      defaultDev: false,
      defaultDataDir: opts.dir,
    })
    await app.bootstrap()
    await app.migrateDown(parseInt(count, 10))
    console.log(`Rolled back ${count} migration(s).`)
    process.exit(0)
  })

migrate
  .command('status')
  .description('show migration status')
  .option('--dir <path>', 'data directory', './pb_data')
  .action(async (opts) => {
    const { Solarch } = await import('./solarch.js')
    const app = new Solarch({
      defaultDev: false,
      defaultDataDir: opts.dir,
    })
    await app.bootstrap()
    const status = app.migrationStatus()
    console.table(status)
    process.exit(0)
  })

migrate
  .command('create')
  .description('create a new migration file')
  .argument('<name>', 'migration name')
  .option('--dir <path>', 'migrations directory', './pb_migrations')
  .action(async (name, opts) => {
    const fs = await import('fs')
    const path = await import('path')
    const dir = opts.dir

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const timestamp = Date.now()
    const filename = `${timestamp}_${name}.js`
    const filepath = path.join(dir, filename)

    const template = `module.exports = {
  async up(app) {
    const db = app.db().getDataDB()
    // Add your migration here
  },

  async down(app) {
    const db = app.db().getDataDB()
    // Add rollback logic here
  }
}
`
    fs.writeFileSync(filepath, template)
    console.log(`Created migration: ${filepath}`)
  })

program
  .command('init')
  .description('scaffold a new Solarch project')
  .option('--dir <path>', 'project directory', '.')
  .action(async (opts) => {
    const fs = await import('fs')
    const path = await import('path')
    const readline = await import('readline')

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r))

    console.log('\n⚡ Solarch Project Initializer\n')

    const name = (await ask('? Project name [my-app]: ')).trim() || 'my-app'
    const dbType = (await ask('? Database (sqlite / postgres) [sqlite]: ')).trim().toLowerCase() || 'sqlite'

    let dbUrl = ''
    if (dbType === 'postgres') {
      dbUrl = (await ask('? PostgreSQL DATABASE_URL: ')).trim()
      while (!dbUrl) {
        dbUrl = (await ask('  DATABASE_URL is required for PostgreSQL: ')).trim()
      }
    }

    const authProvidersInput = (await ask('? Auth providers (email, google, github, discord) [email]: ')).trim() || 'email'
    const authProviders = authProvidersInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    const useRateLimit = (await ask('? Enable rate limiting (y/n) [y]: ')).trim().toLowerCase()
    const enableRateLimit = useRateLimit !== 'n'

    const useAi = (await ask('? Enable AI tools (y/n) [n]: ')).trim().toLowerCase()
    const enableAi = useAi === 'y'

    rl.close()

    const projectDir = path.resolve(opts.dir, name)
    const dataDir = path.join(projectDir, 'pb_data')
    const migrationsDir = path.join(projectDir, 'pb_migrations')

    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(migrationsDir, { recursive: true })

    console.log(`\n✔ Created ${name}/`)
    console.log(`✔ Created pb_data/`)
    console.log(`✔ Created pb_migrations/`)

    const envVars: string[] = [
      `# Solarch Configuration`,
      `JWT_SECRET=`,
      `SOLARCH_ENCRYPTION_KEY=`,
    ]

    if (dbType === 'postgres') {
      envVars.push(`DATABASE_URL=${dbUrl}`)
    }

    if (authProviders.includes('google')) envVars.push(`GOOGLE_CLIENT_ID=`)
    if (authProviders.includes('github')) envVars.push(`GITHUB_CLIENT_ID=`)
    if (authProviders.includes('discord')) envVars.push(`DISCORD_CLIENT_ID=`)

    fs.writeFileSync(path.join(projectDir, '.env'), envVars.join('\n') + '\n')
    console.log(`✔ Created .env`)

    const configLines: string[] = [
      `export default {`,
      `  port: 8090,`,
      `  dataDir: './pb_data',`,
      `  database: { type: '${dbType}'${dbUrl ? `, url: '${dbUrl}'` : ''} },`,
      `  auth: { providers: [${authProviders.map(p => `'${p}'`).join(', ')}] },`,
      `  rateLimiting: { enabled: ${enableRateLimit} },`,
      `  ai: { enabled: ${enableAi} },`,
      `}`,
    ]
    fs.writeFileSync(path.join(projectDir, 'solarch.config.ts'), configLines.join('\n') + '\n')
    console.log(`✔ Created solarch.config.ts`)

    const migrationTemplate = [
      `module.exports = {`,
      `  async up(app) {`,
      `    // Your first migration`,
      `  },`,
      `  async down(app) {`,
      `    // Rollback`,
      `  },`,
      `}`,
    ]
    fs.writeFileSync(path.join(projectDir, 'pb_migrations', `001_init.js`), migrationTemplate.join('\n') + '\n')
    console.log(`✔ Created pb_migrations/001_init.js`)

    if (dbType === 'postgres') {
      const dc = [
        `version: "3.8"`,
        `services:`,
        `  postgres:`,
        `    image: postgres:16-alpine`,
        `    environment:`,
        `      POSTGRES_DB: ${name}`,
        `      POSTGRES_USER: solarch`,
        `      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-change_me}`,
        `    ports:`,
        `      - "5432:5432"`,
        `    volumes:`,
        `      - pg_data:/var/lib/postgresql/data`,
        `volumes:`,
        `  pg_data:`,
      ]
      fs.writeFileSync(path.join(projectDir, 'docker-compose.yml'), dc.join('\n') + '\n')
      console.log(`✔ Created docker-compose.yml`)
    }

    console.log(`\n⚡ Project "${name}" initialized!\n`)
    console.log(`  Next steps:`)
    console.log(`    cd ${name}`)
    console.log(`    solarch serve --port 8090\n`)
    process.exit(0)
  })

program.parse(process.argv)
