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
  const dir = opts.dir || './pb_migrations'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const timestamp = Date.now()
  const filename = `${timestamp}_${name}.js`
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
