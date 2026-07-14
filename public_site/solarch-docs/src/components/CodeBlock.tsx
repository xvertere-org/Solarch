import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { getSingletonHighlighter, type BundledLanguage } from 'shiki'

interface CodeBlockProps {
  code?: string
  children?: ReactNode
  lang?: BundledLanguage
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
}

let highlighterPromise: ReturnType<typeof getSingletonHighlighter> | null = null

function getSharedHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter({
      themes: ['github-dark-dimmed'],
      langs: ['bash', 'typescript', 'javascript', 'json', 'dockerfile', 'sql'],
    })
  }
  return highlighterPromise
}

function processHtml(
  rawHtml: string,
  options: { showLineNumbers?: boolean; highlightLines?: number[] }
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')
  const pre = doc.querySelector('pre')
  if (!pre) return rawHtml

  const codeEl = pre.querySelector('code')
  if (!codeEl) return rawHtml

  const lineEls = Array.from(codeEl.querySelectorAll('.line'))

  const rows = lineEls.map((line, idx) => {
    const lineNum = idx + 1
    const isHighlighted = options.highlightLines?.includes(lineNum) ?? false
    const content = line.innerHTML

    return `<div class="code-row${isHighlighted ? ' code-row-highlighted' : ''}" data-line="${lineNum}">
      ${options.showLineNumbers ? `<span class="code-line-number">${lineNum}</span>` : ''}
      <span class="code-line-content">${content}</span>
    </div>`
  })

  codeEl.innerHTML = rows.join('')
  return pre.outerHTML
}

const langLabelMap: Record<string, string> = {
  bash: 'Bash',
  sh: 'Bash',
  zsh: 'Bash',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  dockerfile: 'Dockerfile',
  sql: 'SQL',
}

export default function CodeBlock({
  code: codeProp,
  children,
  lang = 'typescript',
  filename,
  showLineNumbers = false,
  highlightLines,
}: CodeBlockProps) {
  const code = (codeProp ?? (typeof children === 'string' ? children : '')).trim()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const prevKey = useRef('')

  const key = `${lang}:${code}:${showLineNumbers}:${highlightLines?.join(',') ?? ''}`

  useEffect(() => {
    if (prevKey.current === key) return
    prevKey.current = key
    setLoading(true)

    getSharedHighlighter().then((highlighter) => {
      const raw = highlighter.codeToHtml(code, {
        lang,
        theme: 'github-dark-dimmed',
      })
      const processed = processHtml(raw, { showLineNumbers, highlightLines })
      setHtml(processed)
      setLoading(false)
    })
  }, [code, lang, showLineNumbers, highlightLines, key])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const langLabel = langLabelMap[lang] ?? lang

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-theme bg-theme-surface terminal-accent">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-theme bg-theme-surface px-4 py-2">
        <div className="flex items-center gap-3">
          {filename ? (
            <div className="flex items-center gap-2 rounded-t-md border border-theme border-b-0 bg-theme-surface px-3 py-1.5 -mb-2">
              <span className="text-xs font-medium text-theme-secondary">{filename}</span>
            </div>
          ) : (
            <span className="text-[11px] font-medium uppercase tracking-wider text-theme-muted">
              {langLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {filename && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-theme-muted">
              {langLabel}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-theme-muted transition-colors hover:bg-theme-surface hover:text-theme-secondary"
            aria-label="Copy code"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="relative overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            <ShimmerLine width="85%" />
            <ShimmerLine width="60%" />
            <ShimmerLine width="75%" />
            <ShimmerLine width="40%" />
            <ShimmerLine width="90%" />
          </div>
        ) : (
          <div
            className="code-block-content px-5 py-4 text-sm font-mono leading-relaxed"
            style={{ background: '#0a0f1a', color: '#E5E9F0' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .code-block-content pre {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          overflow: visible !important;
        }
        .code-block-content code {
          font-family: "JetBrains Mono", ui-monospace, monospace !important;
          background: transparent !important;
          padding: 0 !important;
          display: block !important;
        }
        .code-block-content .line {
          display: contents !important;
        }
        .code-block-content pre.shiki {
          background: transparent !important;
        }
        .code-block-content .shiki .line {
          display: inline;
        }
        .code-row {
          display: flex;
          align-items: flex-start;
          min-height: 1.6em;
          padding: 0 0.25rem;
          margin: 0 -0.25rem;
          border-radius: 0.25rem;
        }
        .code-row-highlighted {
          background-color: rgba(26, 111, 255, 0.08);
        }
        .code-line-number {
          display: inline-block;
          width: 2rem;
          margin-right: 1rem;
          text-align: right;
          color: rgba(255, 255, 255, 0.2);
          font-variant-numeric: tabular-nums;
          user-select: none;
          flex-shrink: 0;
        }
        .code-line-content {
          flex: 1;
          min-width: 0;
        }
        .code-line-content .shiki,
        .code-line-content pre {
          all: inherit;
          display: inline !important;
        }
        .code-block-content code :is(.shiki, .github-dark-dimmed) .line {
          display: inline;
        }
        .code-block-content .code-row .code-line-content span {
          font-family: "JetBrains Mono", ui-monospace, monospace !important;
        }
      `}</style>
    </div>
  )
}

function ShimmerLine({ width }: { width: string }) {
  return (
    <div
      className="h-4 rounded bg-theme-muted"
      style={{
        width,
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s infinite',
      }}
    />
  )
}
