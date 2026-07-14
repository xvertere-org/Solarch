const fs = require('fs')
const path = require('path')

const files = [
  'src/components/Navbar.tsx',
  'src/components/DocsLayout.tsx',
  'src/components/Sidebar.tsx',
  'src/components/SearchModal.tsx',
  'src/components/TableOfContents.tsx',
  'src/components/CodeBlock.tsx',
  'src/components/DocSection.tsx',
  'src/components/CopyMarkdownButton.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/Home.tsx',
  'src/pages/docs/getting-started.tsx',
  'src/pages/docs/authentication.tsx',
  'src/pages/docs/collections.tsx',
  'src/pages/docs/ai-tools.tsx',
  'src/pages/docs/vector-search.tsx',
  'src/pages/docs/file-storage.tsx',
  'src/pages/docs/realtime.tsx',
  'src/pages/docs/migrations.tsx',
  'src/pages/docs/javascript-hooks.tsx',
  'src/pages/docs/api-reference.tsx',
  'src/pages/docs/configuration.tsx',
]

const root = '/Users/jay/Downloads/pocketbase-ts/public_site/tspoonbase-docs'

// Mapping of hardcoded colors → theme utilities
// Order matters: longer/more specific first
const replacements = [
  // Backgrounds
  { from: /bg-\[#111111\]/g, to: 'bg-theme-body' },
  { from: /bg-\[#1a1a1a\]/g, to: 'bg-theme-surface' },
  { from: /bg-\[#161616\]/g, to: 'bg-theme-surface' },
  { from: /bg-\[\#0D0D0D\]/g, to: 'bg-theme-body' },
  { from: /bg-dark\//g, to: 'bg-theme-body/' },
  { from: /bg-surface\/30/g, to: 'bg-theme-surface/30' },
  { from: /bg-surface\b(?!\/[0-9])/g, to: 'bg-theme-surface' },
  { from: /bg-muted\b(?!\/[0-9])/g, to: 'bg-theme-muted' },
  { from: /bg-white\/5\b/g, to: 'bg-theme-surface' },
  { from: /bg-white\/\[0\.03\]/g, to: 'bg-theme-muted' },
  { from: /bg-white\/\[0\.02\]/g, to: 'bg-theme-muted' },
  { from: /bg-white\/10\b/g, to: 'bg-theme-muted' },
  { from: /bg-white\/\[0\.04\]/g, to: 'bg-theme-muted' },
  { from: /bg-black\/60\b/g, to: 'bg-black/40' },

  // Text colors
  { from: /text-white\/90\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/80\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/70\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/60\b/g, to: 'text-theme-secondary' },
  { from: /text-white\/50\b/g, to: 'text-theme-tertiary' },
  { from: /text-white\/40\b/g, to: 'text-theme-tertiary' },
  { from: /text-white\/30\b/g, to: 'text-theme-muted' },
  { from: /text-white\/20\b/g, to: 'text-theme-muted' },
  { from: /text-white\b(?!\/)/g, to: 'text-theme' },

  // Border colors
  { from: /border-white\/5\b/g, to: 'border-theme' },
  { from: /border-white\/10\b/g, to: 'border-theme-hover' },
  { from: /border-white\/20\b/g, to: 'border-theme-hover' },
  { from: /border-white\/\[0\.06\]/g, to: 'border-theme' },
  { from: /border-white\/\[0\.02\]/g, to: 'border-theme' },
  { from: /border-white\/\[0\.03\]/g, to: 'border-theme' },
  { from: /border-white\/\[0\.04\]/g, to: 'border-theme' },
  { from: /border-white\/\[0\.08\]/g, to: 'border-theme-hover' },
]

for (const rel of files) {
  const fp = path.join(root, rel)
  if (!fs.existsSync(fp)) {
    console.log('SKIP (not found):', rel)
    continue
  }
  let content = fs.readFileSync(fp, 'utf8')
  let changed = false
  for (const r of replacements) {
    const next = content.replace(r.from, r.to)
    if (next !== content) {
      changed = true
      content = next
    }
  }
  if (changed) {
    fs.writeFileSync(fp, content)
    console.log('FIXED:', rel)
  } else {
    console.log('OK:', rel)
  }
}

console.log('\nDone.')
