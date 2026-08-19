/**
 * Solarch CLI: solarch env show
 * Displays project environment variables with complete masking of secrets, keys, and passwords.
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { EnvShowOptions, EnvShowResult, EnvShowItem } from './types.js'
import { maskEnvValue, isSensitiveKey } from './masking.js'
import { colors } from '../../ui/theme.js'

export async function runEnvShow(opts: EnvShowOptions = {}): Promise<EnvShowResult> {
  const cwd = path.resolve(opts.dir || '.')
  const envPath = path.join(cwd, '.env')

  const rawVars: Record<string, string> = {}

  // Read .env file in target cwd
  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'))
      Object.assign(rawVars, parsed)
    } catch {}
  }

  // Include relevant SOLARCH_ variables from process.env if not in .env
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('SOLARCH_') || k === 'DATABASE_URL' || k === 'JWT_SECRET') {
      if (!(k in rawVars) && v) {
        rawVars[k] = v
      }
    }
  }

  const items: EnvShowItem[] = []
  const maskedVariables: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(rawVars)) {
    const maskedVal = maskEnvValue(key, rawValue)
    const isSecret = isSensitiveKey(key) || /DATABASE_URL/i.test(key)
    items.push({
      key,
      value: maskedVal,
      isSecret,
    })
    maskedVariables[key] = maskedVal
  }

  const result: EnvShowResult = {
    ...(fs.existsSync(envPath) ? { envPath } : {}),
    variables: maskedVariables,
    items,
  }

  // Presentation
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('Environment:'))}\n`)

    if (items.length === 0) {
      console.log(colors.dim('No environment variables configured in .env\n'))
    } else {
      for (const item of items) {
        console.log(`${colors.bold(item.key)}`)
        console.log(`${item.value}\n`)
      }
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
