/**
 * Solarch CLI Generator: solarch generate migration <name>
 */

import fs from 'fs'
import path from 'path'
import { GenerateOptions, GenerateResult } from './types.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export function validateResourceName(name: string): void {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Name is required and cannot be empty')
  }

  const trimmed = name.trim()
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Path traversal characters are strictly forbidden in resource names')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Resource names must contain only alphanumeric characters, underscores, and dashes')
  }
}

export function getNextMigrationPrefix(migrationsDir: string): string {
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
    return '001'
  }

  const files = fs.readdirSync(migrationsDir)
  let maxSeq = 0

  for (const file of files) {
    const match = file.match(/^(\d{1,4})_/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxSeq) {
        maxSeq = num
      }
    }
  }

  return String(maxSeq + 1).padStart(3, '0')
}

export async function generateMigration(opts: GenerateOptions): Promise<GenerateResult> {
  validateResourceName(opts.name)

  const cwd = path.resolve(opts.dir || '.')
  const migrationsDir = path.join(cwd, 'pb_migrations')
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
  }

  const prefix = getNextMigrationPrefix(migrationsDir)
  const cleanName = opts.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  const fileName = `${prefix}_${cleanName}.js`
  const targetPath = path.join(migrationsDir, fileName)

  if (fs.existsSync(targetPath) && !opts.force) {
    throw new Error(`Migration already exists: ${targetPath}. Use --force to overwrite.`)
  }

  const template = `module.exports = {
  async up(app) {
    // Add migration logic
  },

  async down(app) {
    // Add rollback logic
  }
}
`

  fs.writeFileSync(targetPath, template, 'utf-8')
  const relPath = path.relative(cwd, targetPath)

  const result: GenerateResult = {
    type: 'migration',
    name: opts.name,
    filePath: relPath,
    created: true,
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    output.success(`Generated migration: ${colors.bold(relPath)}`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
