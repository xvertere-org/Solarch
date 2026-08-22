/**
 * Solarch CLI Project Filesystem Generator (Phase 1 & Platform Alignment)
 * Performs deterministic file and directory generation without user prompts.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { InitConfig, GenerationResult } from './types.js'
import { MINIMAL_TEMPLATE } from '../../templates/definitions.js'
import { getVersion } from '../../ui/banner.js'
import { ProjectMetadata, ProjectPlan, DatabaseStrategy, SdkSelection, PluginSelection, ProjectIntent } from '../../ecosystem/index.js'

export interface GeneratorHooks {
  onFoldersStart?: () => void
  onFoldersEnd?: () => void
  onSecretsStart?: () => void
  onSecretsEnd?: () => void
  onConfigStart?: () => void
  onConfigEnd?: () => void
  onValidationStart?: () => void
  onValidationEnd?: () => void
}

/**
 * Scaffolds project files and directories on disk from a validated InitConfig.
 */
export function generateProjectFiles(
  config: InitConfig,
  targetBaseDir = '.',
  hooks?: GeneratorHooks
): GenerationResult {
  const baseDir = path.resolve(config.dir || targetBaseDir)
  const projectDir = path.join(baseDir, config.name)
  const template = config.template || MINIMAL_TEMPLATE

  // 1. Path Containment Check
  const relative = path.relative(baseDir, projectDir)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Target path "${projectDir}" escapes base directory "${baseDir}".`
    )
  }

  // 2. Directory Collision Safety (skipped in dry-run)
  if (!config.dryRun && fs.existsSync(projectDir)) {
    const existingFiles = fs.readdirSync(projectDir)
    if (existingFiles.length > 0 && !config.force) {
      throw new Error(
        `Target directory "${projectDir}" already exists and is not empty. Use --force to overwrite.`
      )
    }
  }

  // Compile or resolve ProjectPlan
  let plan = config.plan
  if (!plan) {
    const intent = new ProjectIntent({
      application: (config.template?.name as any) || 'api',
      deployment: config.deployment || 'local',
      desktopRuntime: config.desktopRuntime || 'unspecified',
      explicitChoices: {
        database: config.database,
        sdks: config.sdks,
        plugins: config.plugins,
      },
    })

    const dbStrategy = new DatabaseStrategy({
      engine: config.database,
      topology: config.database === 'postgres' ? 'postgres_only' : config.database === 'mongodb' ? 'mongodb_only' : 'sqlite_only',
      capabilities: { vector: intent.application === 'ai' || intent.application === 'agent' },
      source: 'user',
    })

    plan = new ProjectPlan({
      identity: { name: config.name, dir: config.dir || targetBaseDir },
      intent,
      database: dbStrategy,
      sdks: new SdkSelection({ selected: config.sdks || [] }),
      plugins: new PluginSelection({ mode: config.plugins ? 'selected' : 'none', plugins: config.plugins }),
      desktop: { runtime: config.desktopRuntime || 'unspecified' },
    })
  }

  const filesCreated: string[] = []

  // 3. Dry-Run Plan Compilation
  if (config.dryRun) {
    filesCreated.push('.solarch/project.json')
    filesCreated.push('solarch.config.ts')
    filesCreated.push('.env')
    filesCreated.push('pb_data/')
    filesCreated.push('pb_migrations/')

    for (const m of template.migrations) {
      filesCreated.push(`pb_migrations/${m.file}`)
    }

    if (template.hooks && template.hooks.length > 0) {
      filesCreated.push('src/hooks/')
      for (const h of template.hooks) {
        filesCreated.push(`src/hooks/${h.file}`)
      }
    }

    if ((config.database === 'postgres' || config.database === 'mongodb') && (!config.dbSetup || config.dbSetup === 'local')) {
      filesCreated.push('docker-compose.yml')
    }

    return {
      projectDir,
      projectName: config.name,
      database: config.database,
      dbSetup: config.dbSetup,
      filesCreated,
      dryRun: true,
      plan,
    }
  }

  // 4. Directory Structure
  hooks?.onFoldersStart?.()
  const dotSolarchDir = path.join(projectDir, '.solarch')
  const dataDir = path.join(projectDir, 'pb_data')
  const migrationsDir = path.join(projectDir, 'pb_migrations')
  const hooksDir = path.join(projectDir, 'src', 'hooks')

  fs.mkdirSync(dotSolarchDir, { recursive: true })
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(migrationsDir, { recursive: true })
  if (template.hooks && template.hooks.length > 0) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }

  filesCreated.push(`${config.name}/`)
  filesCreated.push('.solarch/project.json')
  filesCreated.push('pb_data/')
  filesCreated.push('pb_migrations/')
  hooks?.onFoldersEnd?.()

  // 5. Write Local Ecosystem Manifest (.solarch/project.json)
  const currentCliVersion = getVersion()
  const manifest = ProjectMetadata.fromPlan(plan, currentCliVersion)
  fs.writeFileSync(
    path.join(dotSolarchDir, 'project.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  )

  // 6. Cryptographic Secret Generation
  hooks?.onSecretsStart?.()
  const jwtSecret = crypto.randomBytes(32).toString('hex')
  const encKey = crypto.randomBytes(32).toString('hex')

  const envVars: string[] = [
    `# Solarch Configuration`,
    `JWT_SECRET=${jwtSecret}`,
    `SOLARCH_JWT_SECRET=${jwtSecret}`,
    `SOLARCH_ENCRYPTION_KEY=${encKey}`,
  ]

  if (config.database === 'postgres' && config.databaseUrl) {
    envVars.push(`DATABASE_URL=${config.databaseUrl}`)
  } else if (config.database === 'mongodb' && config.databaseUrl) {
    envVars.push(`DATABASE_URL=${config.databaseUrl}`)
  }

  if (config.authProviders.includes('google')) envVars.push(`GOOGLE_CLIENT_ID=`)
  if (config.authProviders.includes('github')) envVars.push(`GITHUB_CLIENT_ID=`)
  if (config.authProviders.includes('discord')) envVars.push(`DISCORD_CLIENT_ID=`)

  // Additional template environment variables
  if (template.envVars) {
    for (const [key, val] of Object.entries(template.envVars)) {
      envVars.push(`${key}=${val}`)
    }
  }

  fs.writeFileSync(path.join(projectDir, '.env'), envVars.join('\n') + '\n', { mode: 0o600 })
  filesCreated.push('.env')
  hooks?.onSecretsEnd?.()

  // 7. solarch.config.ts & Template Migrations / Hooks (Credential-free)
  hooks?.onConfigStart?.()
  const configLines: string[] = [
    `export default {`,
    `  port: 8090,`,
    `  dataDir: './pb_data',`,
    `  database: { type: '${config.database}' },`,
    `  auth: { providers: [${config.authProviders.map(p => `'${p}'`).join(', ')}] },`,
    `  rateLimiting: { enabled: ${config.rateLimit} },`,
    `  ai: { enabled: ${config.ai} },`,
    `}`,
  ]
  fs.writeFileSync(
    path.join(projectDir, 'solarch.config.ts'),
    configLines.join('\n') + '\n'
  )
  filesCreated.push('solarch.config.ts')

  // Write template migrations
  for (const m of template.migrations) {
    const migrationPath = path.join(migrationsDir, m.file)
    fs.writeFileSync(migrationPath, m.content, 'utf-8')
    filesCreated.push(`pb_migrations/${m.file}`)
  }

  // Write template hooks
  if (template.hooks && template.hooks.length > 0) {
    for (const h of template.hooks) {
      const hookPath = path.join(hooksDir, h.file)
      fs.writeFileSync(hookPath, h.content, 'utf-8')
      filesCreated.push(`src/hooks/${h.file}`)
    }
  }

  // docker-compose.yml for local PostgreSQL / MongoDB
  const isLocalContainerSetup = !config.dbSetup || config.dbSetup === 'local'
  if (config.database === 'postgres' && isLocalContainerSetup) {
    const dc = [
      `version: "3.8"`,
      `services:`,
      `  postgres:`,
      `    image: postgres:16-alpine`,
      `    environment:`,
      `      POSTGRES_DB: ${config.name}`,
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
    filesCreated.push('docker-compose.yml')
  } else if (config.database === 'mongodb' && isLocalContainerSetup) {
    const dc = [
      `version: "3.8"`,
      `services:`,
      `  mongodb:`,
      `    image: mongo:7-jammy`,
      `    environment:`,
      `      MONGO_INITDB_DATABASE: ${config.name}`,
      `    ports:`,
      `      - "27017:27017"`,
      `    volumes:`,
      `      - mongo_data:/data/db`,
      `volumes:`,
      `  mongo_data:`,
    ]
    fs.writeFileSync(
      path.join(projectDir, 'docker-compose.yml'),
      dc.join('\n') + '\n'
    )
    filesCreated.push('docker-compose.yml')
  }
  hooks?.onConfigEnd?.()

  // 8. Validation Hooks
  hooks?.onValidationStart?.()
  hooks?.onValidationEnd?.()

  return {
    projectDir,
    projectName: config.name,
    database: config.database,
    dbSetup: config.dbSetup,
    filesCreated,
    plan,
  }
}
