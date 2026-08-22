/**
 * Solarch CLI Init Review Step & Template Preview Card
 * Displays a formatted summary card of the project configuration and prompts confirmation.
 */

import { note, cancel } from '@clack/prompts'
import { promptConfirm } from './confirm.js'
import { colors } from '../theme.js'
import { InitConfig } from '../../cmd/init/types.js'

export interface PromptReviewOptions {
  onCancel?: () => void
}

/**
 * Interactive Configuration Review Step & Template Preview
 * Formats the collected configuration and prompts user confirmation before file generation.
 */
export async function promptReview(
  config: InitConfig,
  options: PromptReviewOptions = {}
): Promise<boolean> {
  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel()
      return
    }
    cancel('Operation cancelled.')
    process.exit(0)
  }

  const lines: string[] = []

  if (config.plan) {
    const plan = config.plan
    const appDisplay = plan.intent.application.toUpperCase()
    const deployDisplay = plan.intent.deployment === 'local_and_cloud'
      ? 'Local + Cloud (Hybrid)'
      : plan.intent.deployment.charAt(0).toUpperCase() + plan.intent.deployment.slice(1)

    let dbDisplay = ''
    if (plan.database.topology === 'sqlite_local_postgres_cloud') {
      dbDisplay = 'SQLite (local) → PostgreSQL + pgvector (cloud)'
    } else if (plan.database.engine === 'postgres') {
      dbDisplay = `PostgreSQL${plan.database.hasVector() ? ' (+ pgvector)' : ''}`
    } else if (plan.database.engine === 'mongodb') {
      dbDisplay = 'MongoDB (Document)'
    } else {
      dbDisplay = 'SQLite (WAL mode)'
    }

    lines.push('Project:')
    lines.push(`  ${colors.bold(plan.identity.name)}`)
    lines.push('')

    lines.push('Application Type:')
    lines.push(`  ${colors.bold(appDisplay)}`)
    lines.push('')

    lines.push('Deployment Model:')
    lines.push(`  ${colors.bold(deployDisplay)}`)
    lines.push('')

    lines.push('Database Strategy:')
    lines.push(`  ${colors.bold(dbDisplay)}`)
    lines.push('')

    const sdksDisplay = plan.sdks.selected.length > 0
      ? plan.sdks.selected.join(', ')
      : 'None (Direct REST API)'
    lines.push('Selected SDKs:')
    lines.push(`  ${colors.bold(sdksDisplay)}`)
    lines.push('')

    if (plan.intent.application === 'desktop' && plan.desktop.runtime !== 'unspecified') {
      const runtimeDisplay = plan.desktop.runtime === 'electron'
        ? 'Electron (TypeScript / Node)'
        : 'Tauri (Rust + Web Frontend)'
      lines.push('Desktop Runtime:')
      lines.push(`  ${colors.bold(runtimeDisplay)}`)
      lines.push('')
    }

    const pluginModeDisplay = plan.plugins.mode === 'later'
      ? 'Configure later from Dashboard'
      : plan.plugins.mode === 'selected'
      ? `Selected (${plan.plugins.plugins.join(', ')})`
      : 'None'
    lines.push('Plugins:')
    lines.push(`  ${colors.bold(pluginModeDisplay)}`)
    lines.push('')

    if (plan.sdks.recommended.length > 0) {
      lines.push('Recommendation Rationale:')
      for (const rec of plan.sdks.recommended) {
        lines.push(`  ${colors.dim(`• ${rec.packageName}: ${rec.reason}`)}`)
      }
    }
  } else {
    // Fallback baseline layout for legacy configs
    const template = config.template
    const dbDisplay = config.database === 'postgres' ? 'PostgreSQL' : config.database === 'mongodb' ? 'MongoDB' : 'SQLite'
    const authDisplay = config.authProviders
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(', ')

    if (template && template.title && template.name !== 'minimal') {
      lines.push(colors.bold(colors.cyan(template.title)))
      lines.push(colors.dim(template.description))
      lines.push('')
    }

    lines.push('Project:')
    lines.push(`  ${colors.bold(config.name)}`)
    lines.push('')

    lines.push('Database:')
    lines.push(`  ${colors.bold(dbDisplay)}`)
    lines.push('')

    lines.push('Authentication:')
    lines.push(`  ${colors.bold(authDisplay)}`)
    lines.push('')

    const features: string[] = []
    if (config.rateLimit) features.push('Rate Limiting')
    if (config.ai) features.push('AI Developer Tools')
    if (features.length === 0) features.push('None')

    lines.push('Features:')
    lines.push(`  ${colors.bold(features.join(', '))}`)
    lines.push('')
  }

  note(lines.join('\n'), 'Solarch Project Plan')

  const confirmed = await promptConfirm({
    message: 'Create this project?',
    initialValue: true,
    onCancel: handleCancel,
  })

  if (!confirmed) {
    if (options.onCancel) {
      options.onCancel()
    }
    return false
  }

  return true
}
