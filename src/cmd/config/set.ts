/**
 * Solarch CLI: solarch config set <key> <value>
 * Safely modifies configuration fields in JSON config files.
 * Refuses AST modification of TypeScript/JavaScript config files with clear guidance.
 * Strictly blocks any attempt to store or mutate secrets (which belong to 'solarch env').
 */

import fs from 'fs'
import path from 'path'
import { ConfigSetOptions, ConfigSetResult } from './types.js'
import { colors } from '../../ui/theme.js'

const FORBIDDEN_SECRET_KEYS = [
  'jwt_secret',
  'jwtsecret',
  'solarch_jwt_secret',
  'solarch_encryption_key',
  'encryption_key',
  'encryptionkey',
  'secret',
  'secrets',
  'password',
  'token',
  'key',
  'api_key',
  'apikey',
]

const ALLOWED_CONFIG_PATHS: Record<string, string[]> = {
  // Runtime
  port: ['port'],
  'runtime.port': ['port'],

  // Database
  'database.type': ['database', 'type'],
  'db.type': ['database', 'type'],
  'database.url': ['database', 'url'],
  'db.url': ['database', 'url'],

  // Auth
  'auth.providers': ['auth', 'providers'],
  providers: ['auth', 'providers'],

  // Features
  'features.ai': ['ai', 'enabled'],
  'ai.enabled': ['ai', 'enabled'],
  ai: ['ai', 'enabled'],

  'features.ratelimiting': ['rateLimiting', 'enabled'],
  'features.rate_limiting': ['rateLimiting', 'enabled'],
  'ratelimiting.enabled': ['rateLimiting', 'enabled'],
  ratelimiting: ['rateLimiting', 'enabled'],
  ratelimit: ['rateLimiting', 'enabled'],
}

/**
 * Parses raw string CLI input into appropriately typed config values
 */
function parseConfigValue(key: string, rawValue: string): any {
  const normalizedKey = key.toLowerCase()

  if (rawValue.toLowerCase() === 'true') return true
  if (rawValue.toLowerCase() === 'false') return false

  if (normalizedKey === 'port' || normalizedKey === 'runtime.port') {
    const num = parseInt(rawValue, 10)
    if (isNaN(num)) {
      throw new Error(`Invalid port value "${rawValue}". Must be a number.`)
    }
    return num
  }

  if (normalizedKey.includes('providers')) {
    return rawValue.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  }

  return rawValue
}

export async function runConfigSet(opts: ConfigSetOptions): Promise<ConfigSetResult> {
  const cwd = path.resolve(opts.dir || '.')
  const rawKey = opts.key.trim()
  const normalizedKey = rawKey.toLowerCase()

  // 1. Guard against forbidden secret fields
  if (FORBIDDEN_SECRET_KEYS.some(k => normalizedKey.includes(k))) {
    const errorMsg = `Cannot set secrets with 'solarch config set'. Secrets and credentials belong to 'solarch env'.`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  // 2. Validate allowed config keys
  const targetPath = ALLOWED_CONFIG_PATHS[normalizedKey]
  if (!targetPath) {
    const errorMsg = `Unsupported configuration key '${rawKey}'. Allowed fields: port, database.type, database.url, auth.providers, features.ai, features.rateLimiting.`
    if (opts.exitOnComplete ?? true) {
      console.error(`\n${colors.red('✖')} ${errorMsg}\n`)
      process.exit(1)
    }
    throw new Error(errorMsg)
  }

  const parsedValue = parseConfigValue(rawKey, opts.value)

  // 3. Inspect existing configuration file format
  const tsPath = path.join(cwd, 'solarch.config.ts')
  const jsPath = path.join(cwd, 'solarch.config.js')
  const jsonPath = path.join(cwd, 'solarch.config.json')

  if (fs.existsSync(tsPath) || fs.existsSync(jsPath)) {
    const activeFile = fs.existsSync(tsPath) ? 'solarch.config.ts' : 'solarch.config.js'
    const fullFilePath = path.join(cwd, activeFile)

    const message = `Manual update required for TypeScript configuration files.\nFile: ${fullFilePath}\nKey: ${targetPath.join('.')}\nValue: ${JSON.stringify(parsedValue)}`

    console.log(`\n${colors.yellow('⚠ Manual update required for TypeScript configuration files.')}`)
    console.log(`${colors.dim('File:')} ${fullFilePath}`)
    console.log(`${colors.dim('Key:')}  ${targetPath.join('.')}`)
    console.log(`${colors.dim('Value:')} ${JSON.stringify(parsedValue)}\n`)

    if (opts.exitOnComplete ?? true) {
      process.exit(0)
    }

    return {
      updated: false,
      configFile: activeFile,
      key: rawKey,
      value: parsedValue,
      manualUpdateRequired: true,
      message,
    }
  }

  // 4. Update or create JSON config file
  let configData: Record<string, any> = {}
  if (fs.existsSync(jsonPath)) {
    try {
      configData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    } catch {
      configData = {}
    }
  }

  // Set nested field
  let current = configData
  for (let i = 0; i < targetPath.length - 1; i++) {
    const seg = targetPath[i]
    if (!current[seg] || typeof current[seg] !== 'object') {
      current[seg] = {}
    }
    current = current[seg]
  }
  current[targetPath[targetPath.length - 1]] = parsedValue

  fs.writeFileSync(jsonPath, JSON.stringify(configData, null, 2) + '\n', 'utf-8')

  console.log(`\n${colors.green('✔')} Updated ${colors.bold(rawKey)} = ${colors.cyan(JSON.stringify(parsedValue))}`)
  console.log(`${colors.dim('Saved to:')} ${path.relative(process.cwd(), jsonPath) || 'solarch.config.json'}\n`)

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return {
    updated: true,
    configFile: 'solarch.config.json',
    key: rawKey,
    value: parsedValue,
  }
}
