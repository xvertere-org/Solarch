/**
 * Solarch CLI Info Command
 * Displays static project metadata, database configuration, auth providers, and enabled features.
 * Guarantees zero leakage of secrets, encryption keys, and database passwords.
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { resolveAppConfig, loadConfigFile } from '../core/config_loader.js'
import { SolarchConfigInput } from '../core/config_types.js'
import { colors } from '../ui/theme.js'

export interface InfoOptions extends SolarchConfigInput {
  dir?: string
  dev?: boolean
  json?: boolean
  exitOnComplete?: boolean
}

export interface ProjectInfoReport {
  name: string
  version: string
  solarchVersion: string
  database: {
    provider: string
    url?: string
  }
  authProviders: string[]
  features: string[]
  environment: string
  dataDir: string
  projectDir: string
  configFile?: string
}

/**
 * Masks sensitive credentials in a database URL (e.g. postgres://user:pass@host:5432/db -> postgres://user:***@host:5432/db)
 */
export function maskDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined
  try {
    const parsed = new URL(rawUrl)
    if (parsed.password) {
      parsed.password = '***'
    }
    return parsed.toString()
  } catch {
    // If not a standard URL, mask password-looking tokens
    return rawUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1***$3')
  }
}

/**
 * Reads static project information and prints formatted metadata report
 */
export async function runInfo(opts: InfoOptions = {}): Promise<ProjectInfoReport> {
  const cwd = path.resolve(opts.dir || '.')

  // 1. Solarch Package Version
  let solarchVersion = '0.19.1'
  try {
    const solarchPkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
    )
    solarchVersion = solarchPkg.version || solarchVersion
  } catch {}

  // 2. Project Metadata (from project's package.json if present)
  let projectName = path.basename(cwd)
  let projectVersion = '0.1.0'
  const projectPkgPath = path.join(cwd, 'package.json')
  if (fs.existsSync(projectPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(projectPkgPath, 'utf-8'))
      if (pkg.name) projectName = pkg.name
      if (pkg.version) projectVersion = pkg.version
    } catch {}
  }

  // 3. Load target directory .env (sanitized)
  const envPath = path.join(cwd, '.env')
  const localEnv: Record<string, string> = {}
  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'))
      Object.assign(localEnv, parsed)
    } catch {}
  }

  // 4. Inspect config files
  let configFile: string | undefined
  let rawDbProvider: string = 'sqlite'
  let rawDbUrl: string | undefined = localEnv.DATABASE_URL
  let authProviders: string[] = ['email']
  let rateLimitEnabled = true
  let aiEnabled = false
  let dataDir = './pb_data'

  const tsPath = path.join(cwd, 'solarch.config.ts')
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  if (fs.existsSync(tsPath)) {
    configFile = 'solarch.config.ts'
    try {
      const tsContent = fs.readFileSync(tsPath, 'utf-8')
      const dbMatch = tsContent.match(/type:\s*['"]([^'"]+)['"]/)
      if (dbMatch) rawDbProvider = dbMatch[1]

      const urlMatch = tsContent.match(/url:\s*['"]([^'"]+)['"]/)
      if (urlMatch) rawDbUrl = urlMatch[1]

      const authMatch = tsContent.match(/providers:\s*\[([^\]]+)\]/)
      if (authMatch) {
        authProviders = authMatch[1]
          .split(',')
          .map(s => s.replace(/['"\s]/g, ''))
          .filter(Boolean)
      }

      const rlMatch = tsContent.match(/rateLimiting:\s*\{\s*enabled:\s*(true|false)/)
      if (rlMatch) rateLimitEnabled = rlMatch[1] === 'true'

      const aiMatch = tsContent.match(/ai:\s*\{\s*enabled:\s*(true|false)/)
      if (aiMatch) aiEnabled = aiMatch[1] === 'true'

      const dataDirMatch = tsContent.match(/dataDir:\s*['"]([^'"]+)['"]/)
      if (dataDirMatch) dataDir = dataDirMatch[1]
    } catch {}
  } else if (fs.existsSync(jsPath) || fs.existsSync(jsonPath)) {
    configFile = fs.existsSync(jsPath) ? 'solarch.config.js' : 'solarch.config.json'
    try {
      const loaded = loadConfigFile(cwd)
      if (loaded?.database?.type) rawDbProvider = loaded.database.type
      if (loaded?.database?.url) rawDbUrl = loaded.database.url
      if (loaded?.auth?.providers) authProviders = loaded.auth.providers
      if (loaded?.rateLimiting?.enabled !== undefined) rateLimitEnabled = loaded.rateLimiting.enabled
      if (loaded?.ai?.enabled !== undefined) aiEnabled = loaded.ai.enabled
      if (loaded?.dataDir) dataDir = loaded.dataDir
    } catch {}
  }

  // 5. Compute features list
  const features: string[] = []
  if (rateLimitEnabled) features.push('Rate Limiting')
  if (aiEnabled) features.push('AI Developer Tools')
  if (features.length === 0) features.push('None')

  const environment = process.env.NODE_ENV === 'production' || opts.dev === false || opts.defaultDev === false
    ? 'Production'
    : 'Development'

  const dbDisplayName = rawDbProvider.toLowerCase() === 'postgres' ? 'PostgreSQL' : 'SQLite'
  const maskedUrl = maskDatabaseUrl(rawDbUrl)

  const report: ProjectInfoReport = {
    name: projectName,
    version: projectVersion,
    solarchVersion,
    database: {
      provider: dbDisplayName,
      ...(maskedUrl ? { url: maskedUrl } : {}),
    },
    authProviders: authProviders.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
    features,
    environment,
    dataDir,
    projectDir: cwd,
    ...(configFile ? { configFile } : {}),
  }

  // 6. Presentation
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('⚡ Solarch Project'))}\n`)

    console.log(`${colors.dim('Name:')}`)
    console.log(`${colors.bold(report.name)}\n`)

    console.log(`${colors.dim('Version:')}`)
    console.log(`${report.version} (Solarch v${report.solarchVersion})\n`)

    console.log(`${colors.dim('Database:')}`)
    console.log(`${colors.bold(report.database.provider)}${report.database.url ? ` (${report.database.url})` : ''}\n`)

    console.log(`${colors.dim('Authentication:')}`)
    console.log(`${report.authProviders.join(', ')}\n`)

    console.log(`${colors.dim('Features:')}`)
    console.log(`${report.features.join(', ')}\n`)

    console.log(`${colors.dim('Environment:')}`)
    console.log(`${report.environment}\n`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return report
}
