import fs from 'fs'
import path from 'path'
import readline from 'readline'
import crypto from 'crypto'

export interface InitOptions {
  dir?: string
  yes?: boolean
  name?: string
  db?: string
  dbUrl?: string
  auth?: string | string[]
  rateLimit?: boolean | string
  ai?: boolean | string
  force?: boolean
  exitOnComplete?: boolean
}

export const VALID_DATABASES = ['sqlite', 'postgres'] as const
export const VALID_AUTH_PROVIDERS = ['email', 'google', 'github', 'discord'] as const

export function validateProjectName(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) {
    throw new Error('Project name cannot be empty.')
  }
  if (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    trimmed === '.' ||
    trimmed === '..'
  ) {
    throw new Error(
      `Invalid project name "${trimmed}". Must be a single path component without path separators or traversal characters.`
    )
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
    throw new Error(
      `Invalid project name "${trimmed}". Project name may only contain alphanumeric characters, hyphens, underscores, and dots.`
    )
  }
  return trimmed
}

export function validateDatabase(db: string): 'sqlite' | 'postgres' {
  const normalized = (db || '').trim().toLowerCase()
  if (!VALID_DATABASES.includes(normalized as any)) {
    throw new Error(
      `Invalid database provider "${db}". Supported: ${VALID_DATABASES.join(', ')}.`
    )
  }
  return normalized as 'sqlite' | 'postgres'
}

export function validateDatabaseUrl(dbType: string, url?: string): string {
  if (dbType !== 'postgres') return ''
  const trimmed = (url || '').trim()
  if (!trimmed) {
    throw new Error(
      'PostgreSQL requires a non-empty DATABASE_URL (e.g. postgres://user:pass@localhost:5432/dbname).'
    )
  }
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    throw new Error(
      `Invalid PostgreSQL DATABASE_URL "${trimmed}". Must begin with "postgres://" or "postgresql://".`
    )
  }
  return trimmed
}

export function validateAuthProviders(providersInput?: string | string[]): string[] {
  if (!providersInput) {
    return ['email']
  }
  let list: string[]
  if (Array.isArray(providersInput)) {
    list = providersInput.map(s => String(s).trim().toLowerCase()).filter(Boolean)
  } else {
    list = String(providersInput)
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  }
  if (list.length === 0) {
    return ['email']
  }
  for (const p of list) {
    if (!VALID_AUTH_PROVIDERS.includes(p as any)) {
      throw new Error(
        `Invalid auth provider "${p}". Supported providers: ${VALID_AUTH_PROVIDERS.join(', ')}.`
      )
    }
  }
  return Array.from(new Set(list))
}

export function parseBoolean(
  val: boolean | string | undefined,
  defaultVal: boolean,
  fieldName: string
): boolean {
  if (val === undefined || val === null) return defaultVal
  if (typeof val === 'boolean') return val
  const s = String(val).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'y' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'n' || s === 'no') return false
  throw new Error(
    `Invalid value for --${fieldName}: "${val}". Expected "true" or "false".`
  )
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  const isInteractive = Boolean(
    !opts.yes &&
    process.stdin.isTTY &&
    process.env.CI !== 'true'
  )

  let name = opts.name !== undefined ? opts.name : 'my-app'
  let dbType = opts.db || 'sqlite'
  let dbUrl = opts.dbUrl || ''
  let authProviders = validateAuthProviders(opts.auth)
  let enableRateLimit = parseBoolean(opts.rateLimit, true, 'rate-limit')
  let enableAi = parseBoolean(opts.ai, false, 'ai')

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    const ask = (q: string): Promise<string> =>
      new Promise(r => rl.question(q, r))

    try {
      console.log('\n⚡ Solarch Project Initializer\n')

      const rawName = await ask(`? Project name [${name}]: `)
      name = rawName.trim() || name

      const rawDb = await ask(`? Database (sqlite / postgres) [${dbType}]: `)
      dbType = rawDb.trim().toLowerCase() || dbType

      if (dbType === 'postgres') {
        dbUrl = (await ask('? PostgreSQL DATABASE_URL: ')).trim()
        while (!dbUrl) {
          dbUrl = (
            await ask('  DATABASE_URL is required for PostgreSQL: ')
          ).trim()
        }
      }

      const defaultAuthStr = authProviders.join(', ')
      const rawAuth = await ask(
        `? Auth providers (email, google, github, discord) [${defaultAuthStr}]: `
      )
      if (rawAuth.trim()) {
        authProviders = validateAuthProviders(rawAuth)
      }

      const rawRateLimit = await ask(
        `? Enable rate limiting (y/n) [${enableRateLimit ? 'y' : 'n'}]: `
      )
      if (rawRateLimit.trim()) {
        enableRateLimit = rawRateLimit.trim().toLowerCase() !== 'n'
      }

      const rawAi = await ask(
        `? Enable AI tools (y/n) [${enableAi ? 'y' : 'n'}]: `
      )
      if (rawAi.trim()) {
        enableAi = rawAi.trim().toLowerCase() === 'y'
      }
    } finally {
      rl.close()
    }
  }

  // --- Pre-flight Validation ---
  const validName = validateProjectName(name)
  const validDbType = validateDatabase(dbType)
  const validDbUrl = validateDatabaseUrl(validDbType, dbUrl)
  const validAuthProviders = validateAuthProviders(authProviders)

  // --- Target Path & Collision Safety ---
  const baseDir = path.resolve(opts.dir || '.')
  const projectDir = path.join(baseDir, validName)

  const relative = path.relative(baseDir, projectDir)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Target path "${projectDir}" escapes base directory "${baseDir}".`
    )
  }

  if (fs.existsSync(projectDir)) {
    const existingFiles = fs.readdirSync(projectDir)
    if (existingFiles.length > 0 && !opts.force) {
      throw new Error(
        `Target directory "${projectDir}" already exists and is not empty. Use --force to overwrite.`
      )
    }
  }

  // --- Filesystem Construction ---
  const dataDir = path.join(projectDir, 'pb_data')
  const migrationsDir = path.join(projectDir, 'pb_migrations')

  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(migrationsDir, { recursive: true })

  console.log(`\n✔ Created ${validName}/`)
  console.log(`✔ Created pb_data/`)
  console.log(`✔ Created pb_migrations/`)

  // --- Cryptographic Secret Generation (A02 / A05) ---
  const jwtSecret = crypto.randomBytes(32).toString('hex')
  const encKey = crypto.randomBytes(32).toString('hex')

  const envVars: string[] = [
    `# Solarch Configuration`,
    `JWT_SECRET=${jwtSecret}`,
    `SOLARCH_ENCRYPTION_KEY=${encKey}`,
  ]

  if (validDbType === 'postgres') {
    envVars.push(`DATABASE_URL=${validDbUrl}`)
  }

  if (validAuthProviders.includes('google')) envVars.push(`GOOGLE_CLIENT_ID=`)
  if (validAuthProviders.includes('github')) envVars.push(`GITHUB_CLIENT_ID=`)
  if (validAuthProviders.includes('discord')) envVars.push(`DISCORD_CLIENT_ID=`)

  fs.writeFileSync(path.join(projectDir, '.env'), envVars.join('\n') + '\n')
  console.log(`✔ Created .env`)

  const configLines: string[] = [
    `export default {`,
    `  port: 8090,`,
    `  dataDir: './pb_data',`,
    `  database: { type: '${validDbType}'${validDbUrl ? `, url: '${validDbUrl}'` : ''} },`,
    `  auth: { providers: [${validAuthProviders.map(p => `'${p}'`).join(', ')}] },`,
    `  rateLimiting: { enabled: ${enableRateLimit} },`,
    `  ai: { enabled: ${enableAi} },`,
    `}`,
  ]
  fs.writeFileSync(
    path.join(projectDir, 'solarch.config.ts'),
    configLines.join('\n') + '\n'
  )
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
  fs.writeFileSync(
    path.join(projectDir, 'pb_migrations', `001_init.js`),
    migrationTemplate.join('\n') + '\n'
  )
  console.log(`✔ Created pb_migrations/001_init.js`)

  if (validDbType === 'postgres') {
    const dc = [
      `version: "3.8"`,
      `services:`,
      `  postgres:`,
      `    image: postgres:16-alpine`,
      `    environment:`,
      `      POSTGRES_DB: ${validName}`,
      `      POSTGRES_USER: solarch`,
      `      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-change_me}`,
      `    ports:`,
      `      - "5432:5432"`,
      `    volumes:`,
      `      - pg_data:/var/lib/postgresql/data`,
      `volumes:`,
      `  pg_data:`,
    ]
    fs.writeFileSync(
      path.join(projectDir, 'docker-compose.yml'),
      dc.join('\n') + '\n'
    )
    console.log(`✔ Created docker-compose.yml`)
  }

  console.log(`\n⚡ Project "${validName}" initialized!\n`)
  console.log(`  Next steps:`)
  console.log(`    cd ${validName}`)
  console.log(`    solarch serve --port 8090\n`)

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }
}
