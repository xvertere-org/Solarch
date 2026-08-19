/**
 * Solarch CLI Generator: solarch generate collection <name>
 */

import fs from 'fs'
import path from 'path'
import { GenerateOptions, GenerateResult } from './types.js'
import { validateResourceName, getNextMigrationPrefix } from './migration.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export async function generateCollection(opts: GenerateOptions): Promise<GenerateResult> {
  validateResourceName(opts.name)

  const cwd = path.resolve(opts.dir || '.')
  const migrationsDir = path.join(cwd, 'pb_migrations')
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
  }

  const prefix = getNextMigrationPrefix(migrationsDir)
  const cleanName = opts.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  const fileName = `${prefix}_create_${cleanName}.js`
  const targetPath = path.join(migrationsDir, fileName)

  if (fs.existsSync(targetPath) && !opts.force) {
    throw new Error(`Collection migration already exists: ${targetPath}. Use --force to overwrite.`)
  }

  const template = `module.exports = {
  async up(app) {
    // Create collection schema
    await app.db().execute(\`
      CREATE TABLE IF NOT EXISTS ${cleanName} (
        id TEXT PRIMARY KEY,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    \`)
  },

  async down(app) {
    // Rollback collection schema
    await app.db().execute(\`DROP TABLE IF EXISTS ${cleanName}\`)
  }
}
`

  fs.writeFileSync(targetPath, template, 'utf-8')
  const relPath = path.relative(cwd, targetPath)

  const result: GenerateResult = {
    type: 'collection',
    name: opts.name,
    filePath: relPath,
    created: true,
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    output.success(`Generated collection migration: ${colors.bold(relPath)}`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
