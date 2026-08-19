import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Solarch } from '../solarch.js'
import { SolarchConfigInput } from '../core/config_types.js'

export interface ServeOptions extends SolarchConfigInput {
  port?: string | number
  hideStartBanner?: boolean
  dir?: string
}

export async function runServe(opts: ServeOptions): Promise<void> {
  const searchDirs = [
    process.cwd(),
    opts.dir ? path.resolve(opts.dir) : null,
    opts.dir ? path.resolve(opts.dir, '..') : null,
    opts.dataDir ? path.resolve(opts.dataDir) : null,
    opts.defaultDataDir ? path.resolve(opts.defaultDataDir) : null,
  ].filter(Boolean) as string[]

  for (const d of searchDirs) {
    const envFile = path.join(d, '.env')
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile })
      break
    }
  }

  const port = typeof opts.port === 'string' ? parseInt(opts.port, 10) : (opts.port ?? 8090)
  const app = new Solarch(opts)
  await app.start(port)
}
