/**
 * Terminal UI formatter for API route inspection.
 */

import { RoutesReport } from './types.js'
import { colors } from '../../ui/theme.js'

export function formatMethod(method: string): string {
  const upper = method.toUpperCase()
  switch (upper) {
    case 'GET':
      return colors.green(upper.padEnd(8, ' '))
    case 'POST':
      return colors.cyan(upper.padEnd(8, ' '))
    case 'PATCH':
    case 'PUT':
      return colors.yellow(upper.padEnd(8, ' '))
    case 'DELETE':
      return colors.red(upper.padEnd(8, ' '))
    case 'WS':
      return colors.magenta(upper.padEnd(8, ' '))
    default:
      return colors.bold(upper.padEnd(8, ' '))
  }
}

export function formatRoutesOutput(report: RoutesReport): void {
  console.log(`\n${colors.bold(colors.cyan('⚡ API Routes'))}\n`)

  console.log(`${colors.bold('REST')}\n`)
  for (const route of report.routes) {
    console.log(`${formatMethod(route.method)}  ${route.path}`)
  }
  console.log('')

  console.log(`${colors.bold('Realtime')}\n`)
  for (const rt of report.realtime) {
    console.log(`${formatMethod(rt.type)}  ${rt.path}`)
  }
  console.log('')

  console.log(`${colors.bold('Middleware')}\n`)
  for (const mw of report.middleware) {
    console.log(`  ${colors.dim('•')} ${mw}`)
  }
  console.log('')
}
