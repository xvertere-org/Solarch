/**
 * Solarch CLI Generator: solarch generate hook <name>
 */

import fs from 'fs'
import path from 'path'
import { GenerateOptions, GenerateResult } from './types.js'
import { validateResourceName } from './migration.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export async function generateHook(opts: GenerateOptions): Promise<GenerateResult> {
  validateResourceName(opts.name)

  const cwd = path.resolve(opts.dir || '.')
  const hooksDir = path.join(cwd, 'src', 'hooks')
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }

  const cleanName = opts.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  const fileName = `${cleanName}.ts`
  const targetPath = path.join(hooksDir, fileName)

  if (fs.existsSync(targetPath) && !opts.force) {
    throw new Error(`Hook already exists: ${targetPath}. Use --force to overwrite.`)
  }

  const template = `export default async function hook(ctx: any) {
  // Hook logic
}
`

  fs.writeFileSync(targetPath, template, 'utf-8')
  const relPath = path.relative(cwd, targetPath)

  const result: GenerateResult = {
    type: 'hook',
    name: opts.name,
    filePath: relPath,
    created: true,
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    output.success(`Generated hook: ${colors.bold(relPath)}`)
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(0)
  }

  return result
}
