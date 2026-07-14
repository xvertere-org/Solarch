const fs = require('fs')
const path = require('path')

const files = [
  'src/components/Footer.tsx',
  'src/components/FeatureCard.tsx',
  'src/components/Terminal.tsx',
  'src/components/Hero.tsx',
]

const root = '/Users/jay/Downloads/pocketbase-ts/public_site/tspoonbase-docs'

const replacements = [
  { from: /bg-\[#0a0a0a\]/g, to: 'bg-theme-body' },
  { from: /text-white\/90\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/60\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/50\b/g, to: 'text-theme-tertiary' },
  { from: /text-white\/40\b/g, to: 'text-theme-tertiary' },
  { from: /text-white\/30\b/g, to: 'text-theme-muted' },
  { from: /text-white\/20\b/g, to: 'text-theme-muted' },
  { from: /text-white\b(?!\/)/g, to: 'text-theme' },
  { from: /border-white\/5\b/g, to: 'border-theme' },
  { from: /border-white\/10\b/g, to: 'border-theme-hover' },
  { from: /bg-surface\b(?!\/[0-9])/g, to: 'bg-theme-surface' },
]

for (const rel of files) {
  const fp = path.join(root, rel)
  if (!fs.existsSync(fp)) { console.log('SKIP:', rel); continue }
  let content = fs.readFileSync(fp, 'utf8')
  let changed = false
  for (const r of replacements) {
    const next = content.replace(r.from, r.to)
    if (next !== content) { changed = true; content = next }
  }
  if (changed) { fs.writeFileSync(fp, content); console.log('FIXED:', rel) }
  else { console.log('OK:', rel) }
}
console.log('\nDone.')
