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

  const template = config.template
  const dbDisplay = config.database === 'postgres' ? 'PostgreSQL' : 'SQLite'
  const authDisplay = config.authProviders
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(', ')

  const lines: string[] = []

  if (template && template.title && template.name !== 'minimal') {
    lines.push(colors.bold(colors.cyan(template.title)))
    lines.push(colors.dim(template.description))
    lines.push('')
  }

  lines.push('Project:')
  lines.push(`  ${colors.bold(config.name)}`)
  lines.push('')

  lines.push('Database:')
  lines.push(`  ${colors.bold(dbDisplay)}${config.databaseUrl ? ` (${config.databaseUrl})` : ''}`)
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

  if (template?.previewIncludes && template.previewIncludes.length > 0) {
    lines.push('Includes:')
    for (const inc of template.previewIncludes) {
      lines.push(`  ${colors.green('✔')} ${inc}`)
    }
  }

  note(lines.join('\n'), 'Solarch Configuration')

  const confirmed = await promptConfirm({
    message: 'Create project?',
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
