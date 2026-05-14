import { BaseApp } from '../core/base'
import { hashPassword } from '../tools/security/crypto'
import { randomBytes } from 'crypto'

interface SuperuserOptions {
  email?: string
  password?: string
  dataDir: string
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

    const app = new BaseApp({
      isDev: false,
      dataDir: opts.dataDir,
    })

    await app.bootstrap()
    await app.runSystemMigrations()

    const db = app.db().getDataDB()

    db.exec(`
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

    db.prepare(
      `INSERT OR REPLACE INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`
    ).run(id, email!, passwordHash, now, now)

    console.log(`Superuser ${email} created successfully.`)
    process.exit(0)
  } catch (err: any) {
    rl.close()
    console.error('Error creating superuser:', err.message)
    process.exit(1)
  }
}

export function hasSuperuser(app: BaseApp): boolean {
  try {
    const db = app.db().getDataDB()
    const hasTable = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='_superusers'`).get() as { count: number }
    if (hasTable.count === 0) return false
    const row = db.prepare(`SELECT COUNT(*) as count FROM _superusers`).get() as { count: number }
    return row.count > 0
  } catch {
    return false
  }
}
