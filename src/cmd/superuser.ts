import { BaseApp } from '../core/base'
import { Solarch } from '../solarch'
import { SolarchConfigInput } from '../core/config_types'
import { hashPassword } from '../tools/security/crypto'
import { randomBytes } from 'crypto'

export interface SuperuserOptions extends SolarchConfigInput {
  email?: string
  password?: string
  app?: BaseApp
  exitOnComplete?: boolean
}

// FIXED[M-4]: Mask password input with * characters
async function silentQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()

    const buf: string[] = []
    const onData = (data: Buffer) => {
      const char = data.toString()
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(wasRaw)
        stdin.pause()
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(buf.join(''))
      } else if (char === '\x7f' || char === '\b') {
        if (buf.length > 0) {
          buf.pop()
          process.stdout.write('\b \b')
        }
      } else {
        buf.push(char)
        process.stdout.write('*')
      }
    }
    stdin.on('data', onData)
  })
}

export async function createSuperuser(opts: SuperuserOptions): Promise<void> {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  try {
    let email = opts.email
    let password = opts.password

    if (!email) {
      email = await question('Email: ')
    }

    if (!password) {
      password = await silentQuestion('Password: ')
    }

    rl.close()

    const app = opts.app ?? new Solarch({
      defaultDev: false,
      defaultDataDir: opts.dataDir ?? opts.defaultDataDir,
      dbProvider: opts.dbProvider ?? opts.provider,
      connectionString: opts.connectionString ?? opts.dbUrl ?? opts.databaseUrl,
      dbDriver: opts.dbDriver ?? opts.driver,
      dbMode: opts.dbMode ?? opts.mode,
    })

    await app.bootstrap()

    await app.db().execute(`
      CREATE TABLE IF NOT EXISTS _superusers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    const passwordHash = await hashPassword(password!)
    // FIXED[M-3]: Use crypto.randomBytes instead of predictable Date.now()
    const id = `su_${randomBytes(8).toString('hex')}`
    const now = new Date().toISOString()

    await app.db().execute(`DELETE FROM _superusers WHERE email = ?`, [email!])
    await app.db().execute(
      `INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`,
      [id, email!, passwordHash, now, now]
    )

    console.log(`Superuser ${email} created successfully.`)
    if (opts.exitOnComplete ?? !opts.app) {
      process.exit(0)
    }
  } catch (err: any) {
    rl.close()
    if (opts.exitOnComplete ?? !opts.app) {
      console.error('Error creating superuser:', err.message)
      process.exit(1)
    }
    throw err
  }
}

export async function hasSuperuser(app: BaseApp): Promise<boolean> {
  try {
    const tableExists = await app.db().hasTable('_superusers')
    if (!tableExists) return false
    const row = await app.db().queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM _superusers`)
    return (row?.count ?? 0) > 0
  } catch {
    return false
  }
}
