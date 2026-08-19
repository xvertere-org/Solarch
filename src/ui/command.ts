/**
 * Central Command Registry and Grouped Help Formatter for Solarch CLI.
 */

import { colors } from './theme.js'
import { getVersion } from './banner.js'

export type CommandCategory =
  | 'PROJECT'
  | 'DEVELOPMENT'
  | 'CONFIGURATION'
  | 'DATABASE'
  | 'INSPECTION'
  | 'ACCOUNT'

export interface CliCommandMetadata {
  name: string
  description: string
  category: CommandCategory
  aliases?: string[]
  interactiveLabel?: string
}

export const COMMANDS: CliCommandMetadata[] = [
  {
    name: 'init',
    description: 'Create a new Solarch project',
    category: 'PROJECT',
    aliases: ['create'],
    interactiveLabel: 'Create project (init)',
  },
  {
    name: 'project',
    description: 'Manage project lifecycle',
    category: 'PROJECT',
    interactiveLabel: 'Project lifecycle (paths, clean, reset)',
  },
  {
    name: 'template',
    description: 'Explore starter templates',
    category: 'PROJECT',
    interactiveLabel: 'Explore templates',
  },
  {
    name: 'dev',
    description: 'Start development server',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Start development server',
  },
  {
    name: 'serve',
    description: 'Start production server',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Start production server',
  },
  {
    name: 'logs',
    description: 'View runtime application logs',
    category: 'DEVELOPMENT',
    interactiveLabel: 'View logs',
  },
  {
    name: 'routes',
    description: 'Explore API routes & realtime endpoints',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Explore API routes',
  },
  {
    name: 'generate',
    description: 'Generate backend resources',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Generate backend files',
  },
  {
    name: 'config',
    description: 'Manage application config',
    category: 'CONFIGURATION',
    interactiveLabel: 'Manage configuration (config)',
  },
  {
    name: 'env',
    description: 'Manage environment',
    category: 'CONFIGURATION',
    interactiveLabel: 'Manage environment (env)',
  },
  {
    name: 'migrate',
    description: 'Database migrations',
    category: 'DATABASE',
    interactiveLabel: 'Database migrations (migrate)',
  },
  {
    name: 'doctor',
    description: 'Diagnose problems',
    category: 'INSPECTION',
    aliases: ['check'],
    interactiveLabel: 'Check project health (doctor)',
  },
  {
    name: 'status',
    description: 'Show runtime status',
    category: 'INSPECTION',
    interactiveLabel: 'Show runtime status (status)',
  },
  {
    name: 'inspect',
    description: 'Inspect project',
    category: 'INSPECTION',
    aliases: ['ls'],
    interactiveLabel: 'Inspect project (inspect)',
  },
  {
    name: 'info',
    description: 'Show static project info',
    category: 'INSPECTION',
    aliases: ['about'],
    interactiveLabel: 'Show project info (info)',
  },
  {
    name: 'superuser',
    description: 'Manage admin users',
    category: 'ACCOUNT',
    interactiveLabel: 'Manage admin users (superuser)',
  },
]

export const CATEGORY_ORDER: CommandCategory[] = [
  'PROJECT',
  'DEVELOPMENT',
  'CONFIGURATION',
  'DATABASE',
  'INSPECTION',
  'ACCOUNT',
]

/**
 * Returns grouped commands by category
 */
export function getCommandGroups(): Record<CommandCategory, CliCommandMetadata[]> {
  const groups: Record<CommandCategory, CliCommandMetadata[]> = {
    PROJECT: [],
    DEVELOPMENT: [],
    CONFIGURATION: [],
    DATABASE: [],
    INSPECTION: [],
    ACCOUNT: [],
  }

  for (const cmd of COMMANDS) {
    if (groups[cmd.category]) {
      groups[cmd.category].push(cmd)
    }
  }

  return groups
}

/**
 * Formats the redesigned root help output grouped by category
 */
export function formatGroupedHelp(customVersion?: string): string {
  const version = customVersion || getVersion()
  const groups = getCommandGroups()
  const lines: string[] = []

  lines.push('')
  lines.push(colors.bold(colors.cyan(`⚡ Solarch CLI v${version}`)))
  lines.push('')

  for (const cat of CATEGORY_ORDER) {
    const cmds = groups[cat]
    if (!cmds || cmds.length === 0) continue

    lines.push('')
    lines.push(colors.bold(cat))
    lines.push('')

    for (const cmd of cmds) {
      const namePadded = cmd.name.padEnd(12, ' ')
      lines.push(`  ${colors.bold(namePadded)}${cmd.description}`)
    }
  }

  lines.push('')
  lines.push('')
  lines.push(colors.bold('Run:'))
  lines.push('')
  lines.push(`  ${colors.cyan('solarch <command> --help')}`)
  lines.push('')

  return lines.join('\n')
}
