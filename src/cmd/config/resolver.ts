/**
 * Resolver for Solarch Configuration.
 * Loads effective resolved configuration adhering to precedence:
 * CLI / Input > Environment Variables > Config File > Defaults
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { resolveAppConfig, loadConfigFile } from '../../core/config_loader.js'
import { ConfigShowOptions, ConfigShowReport } from './types.js'
import { maskDatabaseUrl } from '../env/masking.js'

export function resolveEffectiveConfig(opts: ConfigShowOptions = {}): {
  report: ConfigShowReport
  cwd: string
  env: NodeJS.ProcessEnv
  configFile?: string
} {
  const cwd = path.resolve(opts.dir || '.')

  // 1. Load target directory .env
  const envPath = path.join(cwd, '.env')
  const localEnv: Record<string, string> = {}
  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'))
      Object.assign(localEnv, parsed)
    } catch {}
  }

  // Merge process.env with localEnv (localEnv takes precedence for target directory)
  const env = { ...process.env, ...localEnv }

  // 2. Identify config file
  let configFile: string | undefined
  const tsPath = path.join(cwd, 'solarch.config.ts')
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  let tsConfigValues: Record<string, any> = {}

  if (fs.existsSync(tsPath)) {
    configFile = 'solarch.config.ts'
    try {
      const tsContent = fs.readFileSync(tsPath, 'utf-8')
      const dbMatch = tsContent.match(/type:\s*['"]([^'"]+)['"]/)
      const urlMatch = tsContent.match(/url:\s*['"]([^'"]+)['"]/)
      const authMatch = tsContent.match(/providers:\s*\[([^\]]+)\]/)
      const rlMatch = tsContent.match(/rateLimiting:\s*\{\s*enabled:\s*(true|false)/)
      const aiMatch = tsContent.match(/ai:\s*\{\s*enabled:\s*(true|false)/)
      const portMatch = tsContent.match(/port:\s*(\d+)/)

      if (dbMatch) tsConfigValues.dbType = dbMatch[1]
      if (urlMatch) tsConfigValues.dbUrl = urlMatch[1]
      if (authMatch) {
        tsConfigValues.authProviders = authMatch[1]
          .split(',')
          .map(s => s.replace(/['"\s]/g, '').trim())
          .filter(Boolean)
      }
      if (rlMatch) tsConfigValues.rateLimiting = rlMatch[1] === 'true'
      if (aiMatch) tsConfigValues.ai = aiMatch[1] === 'true'
      if (portMatch) tsConfigValues.port = parseInt(portMatch[1], 10)
    } catch {}
  } else if (fs.existsSync(jsPath)) {
    configFile = 'solarch.config.js'
  } else if (fs.existsSync(jsonPath)) {
    configFile = 'solarch.config.json'
  }

  // 3. Resolve configuration through core config loader
  const resolved = resolveAppConfig(opts, env, { cwd, loadConfigFile: true })

  // 4. Project Name Resolution
  let projectName = path.basename(cwd)
  const pkgPath = path.join(cwd, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.name) projectName = pkg.name
    } catch {}
  }

  // 5. Auth Providers & Feature Flags Resolution
  let authProviders = ['email']
  let rateLimiting = true
  let ai = false

  if (tsConfigValues.authProviders) {
    authProviders = tsConfigValues.authProviders
  }
  if (tsConfigValues.rateLimiting !== undefined) {
    rateLimiting = tsConfigValues.rateLimiting
  }
  if (tsConfigValues.ai !== undefined) {
    ai = tsConfigValues.ai
  }

  if (configFile && (configFile === 'solarch.config.js' || configFile === 'solarch.config.json')) {
    try {
      const fileConfig = loadConfigFile(cwd)
      if (fileConfig?.auth?.providers) authProviders = fileConfig.auth.providers
      if (fileConfig?.rateLimiting?.enabled !== undefined) rateLimiting = fileConfig.rateLimiting.enabled
      if (fileConfig?.ai?.enabled !== undefined) ai = fileConfig.ai.enabled
    } catch {}
  }

  // Provider display name
  const provider = tsConfigValues.dbType || resolved.db.provider
  const rawUrl = tsConfigValues.dbUrl || resolved.db.connectionString
  const maskedUrl = maskDatabaseUrl(rawUrl)

  const report: ConfigShowReport = {
    project: {
      name: projectName,
      dir: cwd,
      ...(configFile ? { configFile } : {}),
    },
    runtime: {
      port: (opts as any).port ? parseInt((opts as any).port, 10) : (tsConfigValues.port || 8090),
      dev: resolved.isDev,
      dataDir: resolved.dataDir,
      queryTimeout: resolved.queryTimeout,
    },
    database: {
      provider,
      driver: resolved.db.driver || (provider.toLowerCase() === 'postgres' ? 'postgres' : 'sqlite'),
      mode: resolved.db.mode || (provider.toLowerCase() === 'sqlite' ? 'local' : 'tcp'),
      ...(maskedUrl ? { url: maskedUrl } : {}),
    },
    auth: {
      providers: authProviders,
    },
    features: {
      rateLimiting,
      ai,
    },
  }

  return {
    report,
    cwd,
    env,
    configFile,
  }
}
