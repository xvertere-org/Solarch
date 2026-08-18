import { Solarch } from '../solarch'
import { SolarchConfigInput } from '../core/config_types'

export interface ServeOptions extends SolarchConfigInput {
  port?: string | number
  hideStartBanner?: boolean
}

export async function runServe(opts: ServeOptions): Promise<void> {
  const port = typeof opts.port === 'string' ? parseInt(opts.port, 10) : (opts.port ?? 8090)
  const app = new Solarch(opts)
  await app.start(port)
}
