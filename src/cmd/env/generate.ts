/**
 * Solarch CLI: solarch env generate
 * Generates missing environment secrets safely using cryptographic entropy.
 * Guarantees zero leakage of generated secret values to stdout/logs.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { EnvGenerateOptions, EnvGenerateResult } from './types.js'
import { promptConfirm } from '../../ui/prompts/confirm.js'
import { colors } from '../../ui/theme.js'

export async function runEnvGenerate(opts: EnvGenerateOptions = {}): Promise<EnvGenerateResult> {
  const cwd = path.resolve(opts.dir || '.')
  const envPath = path.join(cwd, '.env')

  let rawEnvContent = ''
  const parsedEnv: Record<string, string> = {}

  if (fs.existsSync(envPath)) {
    rawEnvContent = fs.readFileSync(envPath, 'utf-8')
    try {
      Object.assign(parsedEnv, dotenv.parse(rawEnvContent))
    } catch {}
  }

  const isInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
  const isForce = Boolean(opts.force)

  // In force mode, confirm if in interactive TTY unless --yes
  if (isForce && !opts.yes && isInteractive) {
    console.log(`\n${colors.yellow('⚠ Existing secrets will be replaced.')}\n`)
    const confirmed = await promptConfirm({
      message: 'Regenerate and overwrite existing project secrets?',
      initialValue: false,
    })

    if (!confirmed) {
      console.log(colors.dim('\nOperation cancelled. No secrets were modified.\n'))
      return {
        updated: false,
        envPath,
        generatedKeys: [],
        skippedKeys: Object.keys(parsedEnv),
        overwritten: false,
      }
    }
  }

  const generatedKeys: string[] = []
  const skippedKeys: string[] = []

  const secretsToEnsure: Record<string, () => string> = {
    JWT_SECRET: () => crypto.randomBytes(32).toString('hex'),
    SOLARCH_JWT_SECRET: () => crypto.randomBytes(32).toString('hex'),
    SOLARCH_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('hex'),
  }

  // If JWT_SECRET is generated, match SOLARCH_JWT_SECRET to the same value
  let sharedJwtSecret: string | null = null

  // Process updates
  const newEntries: [string, string][] = []
  let updatedContent = rawEnvContent

  for (const [key, genFn] of Object.entries(secretsToEnsure)) {
    const exists = Boolean(parsedEnv[key] && parsedEnv[key].trim().length > 0)

    if (exists && !isForce) {
      skippedKeys.push(key)
      continue
    }

    let val: string
    if (key === 'JWT_SECRET' || key === 'SOLARCH_JWT_SECRET') {
      if (!sharedJwtSecret) {
        sharedJwtSecret = genFn()
      }
      val = sharedJwtSecret
    } else {
      val = genFn()
    }

    generatedKeys.push(key)

    // Update in string content if key already present in file, or prepare to append
    const keyRegex = new RegExp(`^${key}=.*$`, 'm')
    if (keyRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(keyRegex, `${key}=${val}`)
    } else {
      newEntries.push([key, val])
    }
  }

  if (newEntries.length > 0) {
    if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
      updatedContent += '\n'
    }
    for (const [k, v] of newEntries) {
      updatedContent += `${k}=${v}\n`
    }
  }

  const updated = generatedKeys.length > 0
  if (updated) {
    fs.writeFileSync(envPath, updatedContent, { mode: 0o600 })
  }

  const result: EnvGenerateResult = {
    updated,
    envPath,
    generatedKeys,
    skippedKeys,
    overwritten: isForce && updated,
  }

  // Presentation
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('⚡ Generating environment'))}\n`)

    if (generatedKeys.length === 0) {
      console.log(colors.green('✔ All required secrets are already configured.'))
      console.log(colors.dim('  (Use --force to regenerate existing secrets)\n'))
    } else {
      for (const key of generatedKeys) {
        console.log(`${colors.green('✔')} Generated ${colors.bold(key)}`)
      }
      console.log(`\n${colors.dim('Updated:')}`)
      console.log(`${path.relative(process.cwd(), envPath) || '.env'}\n`)
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
