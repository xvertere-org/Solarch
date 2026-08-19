/**
 * Solarch CLI: solarch env check
 * Validates project environment configuration, required secrets, DB URL, OAuth, and AI keys.
 * Guaranteed zero leakage of secret values.
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { EnvCheckOptions, EnvCheckReport, EnvCheckItem } from './types.js'
import { loadConfigFile } from '../../core/config_loader.js'
import { colors } from '../../ui/theme.js'

export async function runEnvCheck(opts: EnvCheckOptions = {}): Promise<EnvCheckReport> {
  const cwd = path.resolve(opts.dir || '.')
  const checks: EnvCheckItem[] = []

  // 1. Read .env file in target cwd
  const envPath = path.join(cwd, '.env')
  const localEnv: Record<string, string> = {}
  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'))
      Object.assign(localEnv, parsed)
    } catch {}
  }

  const getEnv = (key: string): string | undefined => {
    if (localEnv[key] !== undefined) return localEnv[key]
    if (opts.dir && fs.existsSync(envPath)) {
      return undefined
    }
    return process.env[key]
  }

  // 2. Read Configuration File
  let configFileLoaded = false
  let rawDbProvider = 'sqlite'
  let rawDbUrl: string | undefined = getEnv('DATABASE_URL')
  let authProviders: string[] = []
  let aiEnabled = false
  let dataDir = getEnv('SOLARCH_DATA_DIR') || './pb_data'

  const tsPath = path.join(cwd, 'solarch.config.ts')
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  if (fs.existsSync(tsPath)) {
    configFileLoaded = true
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
          .map(s => s.replace(/['"\s]/g, '').toLowerCase())
          .filter(Boolean)
      }

      const aiMatch = tsContent.match(/ai:\s*\{\s*enabled:\s*(true|false)/)
      if (aiMatch) aiEnabled = aiMatch[1] === 'true'

      const dataDirMatch = tsContent.match(/dataDir:\s*['"]([^'"]+)['"]/)
      if (dataDirMatch) dataDir = dataDirMatch[1]
    } catch {}
  } else if (fs.existsSync(jsPath) || fs.existsSync(jsonPath)) {
    try {
      const loaded = loadConfigFile(cwd)
      if (loaded) {
        configFileLoaded = true
        if (loaded.database?.type) rawDbProvider = loaded.database.type
        if (loaded.database?.url) rawDbUrl = loaded.database.url
        if (loaded.auth?.providers) authProviders = loaded.auth.providers.map(p => p.toLowerCase())
        if (loaded.ai?.enabled !== undefined) aiEnabled = loaded.ai.enabled
        if (loaded.dataDir) dataDir = loaded.dataDir
      }
    } catch {}
  }

  // --- CHECK 1: Configuration File ---
  if (configFileLoaded) {
    checks.push({
      id: 'config_file',
      name: 'Configuration file',
      status: 'pass',
      message: 'loaded',
    })
  } else {
    checks.push({
      id: 'config_file',
      name: 'Configuration file',
      status: 'warn',
      message: 'using default configuration',
    })
  }

  // --- CHECK 2: SOLARCH_JWT_SECRET ---
  const jwtSecret = getEnv('SOLARCH_JWT_SECRET') || getEnv('JWT_SECRET')
  if (jwtSecret && jwtSecret.trim().length >= 32) {
    checks.push({
      id: 'jwt_secret',
      name: 'SOLARCH_JWT_SECRET',
      status: 'pass',
      message: 'configured',
    })
  } else if (jwtSecret) {
    checks.push({
      id: 'jwt_secret',
      name: 'SOLARCH_JWT_SECRET',
      status: 'fail',
      message: 'too short (must be at least 32 characters)',
    })
  } else {
    checks.push({
      id: 'jwt_secret',
      name: 'SOLARCH_JWT_SECRET',
      status: 'fail',
      message: 'missing (set in .env or environment)',
    })
  }

  // --- CHECK 3: SOLARCH_ENCRYPTION_KEY ---
  const encKey = getEnv('SOLARCH_ENCRYPTION_KEY')
  if (encKey && encKey.trim().length > 0) {
    checks.push({
      id: 'encryption_key',
      name: 'SOLARCH_ENCRYPTION_KEY',
      status: 'pass',
      message: 'configured',
    })
  } else {
    checks.push({
      id: 'encryption_key',
      name: 'SOLARCH_ENCRYPTION_KEY',
      status: 'fail',
      message: 'missing (set in .env or environment)',
    })
  }

  // --- CHECK 4: Database Configuration ---
  const isPostgres = rawDbProvider.toLowerCase() === 'postgres' || !!getEnv('DATABASE_URL')
  if (isPostgres) {
    const dbUrl = rawDbUrl || getEnv('DATABASE_URL')
    if (!dbUrl) {
      checks.push({
        id: 'database_url',
        name: 'DATABASE_URL',
        status: 'fail',
        message: 'missing for PostgreSQL configuration',
      })
    } else {
      const isValidProtocol = /^postgres(ql)?:\/\//i.test(dbUrl.trim())
      if (isValidProtocol) {
        checks.push({
          id: 'database_url',
          name: 'DATABASE_URL',
          status: 'pass',
          message: 'valid',
        })
      } else {
        checks.push({
          id: 'database_url',
          name: 'DATABASE_URL',
          status: 'fail',
          message: 'invalid format (must begin with postgres:// or postgresql://)',
        })
      }
    }
  } else {
    // SQLite: verify data dir
    const resolvedDataDir = path.isAbsolute(dataDir) ? dataDir : path.join(cwd, dataDir)
    try {
      const parent = path.dirname(resolvedDataDir)
      if (fs.existsSync(resolvedDataDir) || fs.existsSync(parent)) {
        checks.push({
          id: 'database_storage',
          name: 'Database Storage (SQLite)',
          status: 'pass',
          message: `valid (${dataDir})`,
        })
      } else {
        checks.push({
          id: 'database_storage',
          name: 'Database Storage (SQLite)',
          status: 'warn',
          message: `data directory ${dataDir} will be created on start`,
        })
      }
    } catch {
      checks.push({
        id: 'database_storage',
        name: 'Database Storage (SQLite)',
        status: 'fail',
        message: `unreachable data directory path: ${dataDir}`,
      })
    }
  }

  // --- CHECK 5: OAuth Provider Configuration ---
  if (authProviders.includes('google')) {
    const googleId = getEnv('GOOGLE_CLIENT_ID')
    if (googleId && googleId.trim().length > 0) {
      checks.push({
        id: 'oauth_google',
        name: 'GOOGLE_CLIENT_ID',
        status: 'pass',
        message: 'configured',
      })
    } else {
      checks.push({
        id: 'oauth_google',
        name: 'GOOGLE_CLIENT_ID',
        status: 'fail',
        message: 'missing for enabled Google OAuth provider',
      })
    }
  }

  if (authProviders.includes('github')) {
    const githubId = getEnv('GITHUB_CLIENT_ID')
    if (githubId && githubId.trim().length > 0) {
      checks.push({
        id: 'oauth_github',
        name: 'GITHUB_CLIENT_ID',
        status: 'pass',
        message: 'configured',
      })
    } else {
      checks.push({
        id: 'oauth_github',
        name: 'GITHUB_CLIENT_ID',
        status: 'fail',
        message: 'missing for enabled GitHub OAuth provider',
      })
    }
  }

  if (authProviders.includes('discord')) {
    const discordId = getEnv('DISCORD_CLIENT_ID')
    if (discordId && discordId.trim().length > 0) {
      checks.push({
        id: 'oauth_discord',
        name: 'DISCORD_CLIENT_ID',
        status: 'pass',
        message: 'configured',
      })
    } else {
      checks.push({
        id: 'oauth_discord',
        name: 'DISCORD_CLIENT_ID',
        status: 'fail',
        message: 'missing for enabled Discord OAuth provider',
      })
    }
  }

  // --- CHECK 6: AI Configuration ---
  if (aiEnabled) {
    const aiKey = getEnv('OPENAI_API_KEY') || getEnv('ANTHROPIC_API_KEY') || getEnv('GEMINI_API_KEY')
    if (aiKey && aiKey.trim().length > 0) {
      checks.push({
        id: 'ai_key',
        name: 'AI API Key',
        status: 'pass',
        message: 'configured',
      })
    } else {
      checks.push({
        id: 'ai_key',
        name: 'AI API Key',
        status: 'warn',
        message: 'missing (set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY)',
      })
    }
  }

  const hasFailures = checks.some(c => c.status === 'fail')
  const report: EnvCheckReport = {
    timestamp: new Date().toISOString(),
    valid: !hasFailures,
    checks,
  }

  // Presentation
  if (!opts.silent) {
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`\n${colors.bold(colors.cyan('⚡ Environment Check'))}\n`)

      for (const check of checks) {
        let icon = colors.green('✔')
        if (check.status === 'warn') icon = colors.yellow('⚠')
        if (check.status === 'fail') icon = colors.red('✖')

        console.log(`${icon} ${colors.bold(check.name)}`)
        console.log(`  ${check.message}\n`)
      }

      if (report.valid) {
        console.log(colors.green('Environment ready.\n'))
      } else {
        console.log(colors.red('Environment check failed with one or more issues.\n'))
      }
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(report.valid ? 0 : 1)
  }

  return report
}
