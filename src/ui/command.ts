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
  | 'PLATFORM'

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
    name: 'db',
    description: 'Database provisioning and topology sync',
    category: 'DATABASE',
    interactiveLabel: 'Database provisioning (db)',
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
  {
    name: 'login',
    description: 'Authenticate with Solarch Platform',
    category: 'PLATFORM',
    interactiveLabel: 'Authenticate with platform (login)',
  },
  {
    name: 'logout',
    description: 'Clear stored platform credentials',
    category: 'PLATFORM',
    interactiveLabel: 'Log out from platform (logout)',
  },
  {
    name: 'whoami',
    description: 'Show authenticated platform identity',
    category: 'PLATFORM',
    interactiveLabel: 'Show platform identity (whoami)',
  },
  {
    name: 'link',
    description: 'Link project to Solarch Platform',
    category: 'PLATFORM',
    interactiveLabel: 'Link project to platform (link)',
  },
  {
    name: 'unlink',
    description: 'Unlink project from Solarch Platform',
    category: 'PLATFORM',
    interactiveLabel: 'Unlink project (unlink)',
  },
  {
    name: 'sync',
    description: 'Synchronize config from Solarch Platform',
    category: 'PLATFORM',
    interactiveLabel: 'Sync platform configuration (sync)',
  },
  {
    name: 'deploy',
    description: 'Deploy project to cloud environments',
    category: 'PLATFORM',
    interactiveLabel: 'Deploy project (deploy)',
  },
  {
    name: 'metrics',
    description: 'Inspect runtime telemetry and performance metrics',
    category: 'PLATFORM',
    interactiveLabel: 'Inspect metrics (metrics)',
  },
  {
    name: 'traces',
    description: 'Inspect distributed request trace spans',
    category: 'PLATFORM',
    interactiveLabel: 'Inspect traces (traces)',
  },
  {
    name: 'alerts',
    description: 'View production alerts and health status',
    category: 'PLATFORM',
    interactiveLabel: 'View alerts (alerts)',
  },
  {
    name: 'service',
    description: 'Manage production services, scaling, traffic, and maintenance',
    category: 'PLATFORM',
    interactiveLabel: 'Manage production service (service)',
  },
  {
    name: 'sdk',
    description: 'Manage and provision client SDK packages',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Manage client SDKs (sdk)',
  },
  {
    name: 'plugin',
    description: 'Manage and discover ecosystem plugins',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Manage plugins (plugin)',
  },
  {
    name: 'mcp',
    description: 'Inspect and govern MCP tools and capabilities for external AI agents',
    category: 'DEVELOPMENT',
    interactiveLabel: 'Inspect MCP tools & governance (mcp)',
  },
]

export const CATEGORY_ORDER: CommandCategory[] = [
  'PROJECT',
  'DEVELOPMENT',
  'CONFIGURATION',
  'DATABASE',
  'INSPECTION',
  'ACCOUNT',
  'PLATFORM',
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
    PLATFORM: [],
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
