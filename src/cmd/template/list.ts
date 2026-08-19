/**
 * Solarch CLI: solarch template list
 */

import { TemplateListOptions, TemplateSummary } from './types.js'
import { listTemplates } from '../../templates/registry.js'
import { colors } from '../../ui/theme.js'

export async function runTemplateList(opts: TemplateListOptions = {}): Promise<TemplateSummary[]> {
  const templates = listTemplates()

  const summaries: TemplateSummary[] = templates.map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    recommendedDatabase: t.recommendedDatabase,
    previewIncludes: t.previewIncludes,
  }))

  if (opts.json) {
    console.log(JSON.stringify(summaries, null, 2))
  } else {
    console.log(`\n${colors.bold(colors.cyan('⚡ Available Templates'))}\n`)

    for (const t of templates) {
      console.log(colors.bold(t.title))
      console.log(colors.dim(`solarch init --template ${t.name}`))
      console.log('')
      if (t.previewIncludes) {
        for (const inc of t.previewIncludes) {
          console.log(`  ${colors.green('•')} ${inc}`)
        }
      }
      console.log('')
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return summaries
}
