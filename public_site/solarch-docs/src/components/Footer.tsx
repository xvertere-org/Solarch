import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'

const productLinks = [
  { label: 'Quick Start', href: '/docs/getting-started/quick-start' },
  { label: 'Documentation', href: '/docs' },
  { label: 'Projects', href: '/projects' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'FAQ', href: '/faq' },
  { label: 'About', href: '/about' },
]

const communityLinks = [
  { label: 'GitHub', href: 'https://github.com/Jay-Suryawansh7/solarch' },
  { label: 'npm', href: 'https://www.npmjs.com/package/solarch' },
  { label: 'Issues', href: 'https://github.com/Jay-Suryawansh7/solarch/issues' },
  { label: 'Discussions', href: 'https://github.com/Jay-Suryawansh7/solarch/discussions' },
]

const docsLinks = [
  { label: 'Auth', href: '/docs/authentication' },
  { label: 'Collections', href: '/docs/collections' },
  { label: 'Realtime', href: '/docs/realtime' },
  { label: 'AI Tools', href: '/docs/ai-tools' },
]

function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/solarch-logo.png"
      alt="Solarch"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-theme bg-theme-body">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 group mb-4">
              <Logo className="h-8 w-8" />
              <span className="font-heading text-lg font-bold text-theme">
                Solarch
              </span>
            </Link>
            <p className="mb-4 max-w-xs text-sm text-theme-secondary">
              A TypeScript Backend-as-a-Service in a single package.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Jay-Suryawansh7/solarch"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-theme bg-theme-surface text-theme-secondary transition-colors hover:border-primary hover:text-primary"
                aria-label="GitHub"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://www.npmjs.com/package/solarch"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-theme bg-theme-surface text-theme-secondary transition-colors hover:border-primary hover:text-primary"
                aria-label="npm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.838h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-theme-muted">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-theme-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Docs */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-theme-muted">
              Docs
            </h4>
            <ul className="space-y-3">
              {docsLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-theme-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-theme-muted">
              Community
            </h4>
            <ul className="space-y-3">
              {communityLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-theme-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-theme pt-8 text-center text-sm text-theme-muted">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Link to="/privacy" className="transition-colors hover:text-primary">Privacy Policy</Link>
            <span className="text-theme-muted/40">·</span>
            <a href="https://github.com/Jay-Suryawansh7/solarch/blob/main/LICENSE" target="_blank" rel="noreferrer" className="transition-colors hover:text-primary">Apache-2.0 License</a>
          </div>
          &copy; {new Date().getFullYear()} Solarch.
        </div>
      </div>
    </footer>
  )
}
