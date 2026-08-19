/**
 * Solarch CLI: solarch template info <name>
 */

import { TemplateInfoOptions } from './types.js'
import { loadTemplate } from '../../templates/loader.js'
import { TemplateDefinition } from '../../templates/types.js'
import { colors } from '../../ui/theme.js'

export async function runTemplateInfo(opts: TemplateInfoOptions): Promise<TemplateDefinition> {
  const template = loadTemplate(opts.name)

  if (opts.json) {
    console.log(JSON.stringify(template, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan(`⚡ Template: ${template.title}`))}\n`)
    console.log(`${colors.bold('Description:')}`)
    console.log(`  ${template.description}\n`)

    if (template.previewIncludes && template.previewIncludes.length > 0) {
      console.log(`${colors.bold('Includes:')}`)
      for (const inc of template.previewIncludes) {
        console.log(`  ${colors.green('✔')} ${inc}`)
      }
      console.log('')
    }

    console.log(`${colors.bold('Database:')}`)
    console.log(`  ${template.recommendedDatabase === 'postgres' ? 'PostgreSQL recommended' : 'SQLite recommended'}\n`)

    console.log(`${colors.bold('Migrations:')}`)
    for (const m of template.migrations) {
      console.log(`  ${colors.cyan('•')} ${m.file}`)
    }
    console.log('')

    if (template.hooks && template.hooks.length > 0) {
      console.log(`${colors.bold('Hooks:')}`)
      for (const h of template.hooks) {
        console.log(`  ${colors.magenta('•')} src/hooks/${h.file}`)
      }
      console.log('')
    }

    console.log(`${colors.bold('Quickstart:')}`)
    console.log(`  ${colors.cyan(`solarch init --template ${template.name}`)}\n`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return template
}
