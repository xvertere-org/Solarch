import { Solarch } from '../solarch'
import { SolarchConfigInput } from '../core/config_types'
import fs from 'fs'
import path from 'path'

export type MigrateOptions = SolarchConfigInput

export async function runMigrateUp(opts: MigrateOptions = {}): Promise<void> {
  const app = new Solarch(opts)
  await app.bootstrap()
  await app.migrate()
  console.log('Migrations completed.')
  process.exit(0)
}

export async function runMigrateDown(count: string | number = 1, opts: MigrateOptions = {}): Promise<void> {
  const countNum = typeof count === 'string' ? parseInt(count, 10) : count
  const app = new Solarch(opts)
  await app.bootstrap()
  await app.migrateDown(countNum)
  console.log(`Rolled back ${countNum} migration(s).`)
  process.exit(0)
}

export async function runMigrateStatus(opts: MigrateOptions = {}): Promise<void> {
  const app = new Solarch(opts)
  await app.bootstrap()
  const status = await app.migrationStatus()
  console.table(status)
  process.exit(0)
}

export async function runMigrateCreate(name: string, opts: { dir?: string } = {}): Promise<void> {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Migration name is required and cannot be empty')
  }

  const trimmed = name.trim()
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Path traversal characters are strictly forbidden in migration names')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Migration names must contain only alphanumeric characters, underscores, and dashes')
  }

  const dir = opts.dir || './pb_migrations'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const timestamp = Date.now()
  const cleanName = trimmed.toLowerCase()
  const filename = `${timestamp}_${cleanName}.js`
  const filepath = path.join(dir, filename)

  const template = `module.exports = {
  async up(app) {
    // Add your migration here
    // e.g. await app.db().execute("...")
  },

  async down(app) {
    // Add rollback logic here
    // e.g. await app.db().execute("...")
  }
}
`
  fs.writeFileSync(filepath, template)
  console.log(`Created migration: ${filepath}`)
}
