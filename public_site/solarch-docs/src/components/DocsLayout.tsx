import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import TableOfContents from './TableOfContents'
import CopyMarkdownButton from './CopyMarkdownButton'
import { useDocsDrawer } from './DocsDrawerContext'
import { findNavPath, getPrevNext } from '../lib/navigation'

interface DocsLayoutProps {
  children: React.ReactNode
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  const { open: mobileOpen, setOpen: setMobileOpen } = useDocsDrawer()
  const { section, subsection } = useParams<{ section: string; subsection?: string }>()

  const currentPath = subsection
    ? `/docs/${section}/${subsection}`
    : `/docs/${section}`

  const { section: navSection, subsection: navSubsection } = findNavPath(currentPath)
  const { prev, next } = getPrevNext(currentPath)

  const pageTitle = navSubsection?.label || navSection?.label || 'Documentation'

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [setMobileOpen])

  return (
    <div className="flex min-h-screen pt-14">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={handleCloseMobile} />

      <div className="flex flex-1 min-w-0">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-[760px] px-5 py-8 sm:px-8 sm:py-10">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="mb-6 inline-flex items-center gap-2 rounded-lg border border-theme-hover bg-theme-surface px-3 py-2 text-sm text-theme-secondary transition-colors hover:bg-theme-surface lg:hidden"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 text-sm text-theme-tertiary">
              <Link to="/" className="hover:text-theme-secondary transition-colors">
                Home
              </Link>
              <ChevronLeft className="h-3 w-3 rotate-180" />
              {navSection && (
                <>
                  <Link
                    to={navSection.path}
                    className="hover:text-theme-secondary transition-colors"
                  >
                    {navSection.label}
                  </Link>
                  {navSubsection && (
                    <>
                      <ChevronLeft className="h-3 w-3 rotate-180" />
                      <span className="text-theme-secondary">{navSubsection.label}</span>
                    </>
                  )}
                </>
              )}
            </nav>

            {/* Header row */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-theme sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 text-sm text-theme-tertiary">
                  {navSection && navSubsection
                    ? `${navSection.label} documentation`
                    : 'Solarch documentation'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CopyMarkdownButton
                  section={section || ''}
                  pageTitle={pageTitle}
                />
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0">
              {children}
            </div>

            {/* Prev / Next */}
            <div className="mt-16 grid grid-cols-1 gap-4 border-t border-theme pt-8 sm:grid-cols-2">
              {prev ? (
                <Link
                  to={prev.path}
                  className="group flex flex-col rounded-xl border border-theme bg-theme-surface p-4 transition-colors hover:border-primary/20"
                >
                  <span className="mb-1 flex items-center gap-1 text-xs text-theme-muted">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </span>
                  <span className="font-heading text-sm font-medium text-theme group-hover:text-primary">
                    {prev.label}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  to={next.path}
                  className="group flex flex-col items-end rounded-xl border border-theme bg-theme-surface p-4 text-right transition-colors hover:border-primary/20"
                >
                  <span className="mb-1 flex items-center gap-1 text-xs text-theme-muted">
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-heading text-sm font-medium text-theme group-hover:text-primary">
                    {next.label}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>

        {/* TOC */}
        <TableOfContents />
      </div>
    </div>
  )
}
