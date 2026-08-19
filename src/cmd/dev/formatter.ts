/**
 * Terminal UI formatter for the Solarch Development Server.
 */

import { colors } from '../../ui/theme.js'

export interface DevBannerOptions {
  port: number
  mode: string
  watchPaths: string[]
  isWatching: boolean
}

export function formatDevBanner(opts: DevBannerOptions): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ Starting Solarch Development Server'))}\n`)

  console.log(`${colors.green('✔')} Environment validated`)
  console.log(`${colors.green('✔')} Configuration loaded`)
  console.log(`${colors.green('✔')} Database connected\n`)

  console.log(`${colors.bold('Server')}`)
  console.log(`${colors.dim('Local:')}`)
  console.log(`http://localhost:${opts.port}\n`)

  console.log(`${colors.bold('Mode:')}`)
  console.log(`${opts.mode}\n`)

  if (opts.isWatching && opts.watchPaths.length > 0) {
    console.log(`${colors.bold('Watching:')}`)
    for (const p of opts.watchPaths) {
      console.log(`  ${p}`)
    }
    console.log('')
  }

  console.log(`${colors.bold('Press:')}`)
  console.log(`  ${colors.bold('r')}  restart`)
  console.log(`  ${colors.bold('l')}  logs`)
  console.log(`  ${colors.bold('d')}  doctor`)
  console.log(`  ${colors.bold('q')}  quit\n`)
}

export function formatRestartBanner(reason?: string): void {
  console.log(`\n${colors.cyan('🔄')} ${colors.bold('Restarting Solarch development server...')}${reason ? ` (${reason})` : ''}\n`)
}

export function formatLogs(logs: string[]): void {
  console.log(`\n${colors.bold(colors.cyan('📋 Latest Server Logs:'))}\n`)
  if (logs.length === 0) {
    console.log(colors.dim('No recent request logs.\n'))
  } else {
    for (const log of logs.slice(-20)) {
      console.log(`  ${colors.dim(log)}`)
    }
    console.log('')
  }
}
