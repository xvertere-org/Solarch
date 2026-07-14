import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Code,
  User,
  Menu,
  X,
  Moon,
  Sun,
  Search,
  Command,
  Layers,
  HelpCircle,
  Shield,
  MessageSquareText,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDocsDrawer } from './DocsDrawerContext'
import { useTheme } from './ThemeProvider'
import SearchModal from './SearchModal'

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

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { open: drawerOpen, setOpen: setDrawerOpen } = useDocsDrawer()
  const { theme, toggle } = useTheme()
  const isDocs = location.pathname.startsWith('/docs')
  const isProjects = location.pathname.startsWith('/projects')
  const isAbout = location.pathname === '/about'
  const isFaq = location.pathname === '/faq'
  const isPrivacy = location.pathname === '/privacy'
  const isFeedback = location.pathname === '/feedback'

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || isDocs || isAbout
            ? 'border-b border-theme nav-blur'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <Logo className="h-7 w-7 transition-transform group-hover:scale-105" />
            <span className="font-heading text-base font-bold tracking-tight text-theme">
              Solarch
            </span>
            <span className="hidden rounded-full border border-theme bg-theme-surface px-2 py-0.5 text-[10px] font-medium text-theme-muted sm:inline-block">
              v0.7.0
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/docs/getting-started/quick-start"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isDocs
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Docs</span>
            </Link>

            <Link
              to="/projects"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isProjects
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Projects</span>
            </Link>

            <Link
              to="/docs/torque/overview"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                location.pathname.startsWith('/docs/torque')
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Torque</span>
            </Link>

            <Link
              to="/about"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isAbout
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>About</span>
            </Link>

            <Link
              to="/feedback"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isFeedback
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Feedback</span>
            </Link>

            <Link
              to="/faq"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isFaq
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>FAQ</span>
            </Link>

            <Link
              to="/privacy"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isPrivacy
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-tertiary hover:bg-theme-surface hover:text-theme-secondary'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Privacy</span>
            </Link>
          </nav>

          <div className="hidden items-center gap-1 md:flex shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="group flex items-center gap-2 rounded-lg border border-theme bg-theme-surface px-3 py-1.5 text-sm text-theme-tertiary transition-all hover:border-theme-hover hover:bg-theme-surface hover:text-theme-secondary"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-theme-hover bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted lg:flex">
                <Command className="h-2.5 w-2.5" />
                <span>K</span>
              </kbd>
            </button>

            <div className="mx-2 h-4 w-px bg-theme-surface" />

            <a
              href={import.meta.env.VITE_GITHUB_URL || 'https://github.com/Jay-Suryawansh7/solarch'}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-tertiary transition-all hover:bg-theme-surface hover:text-theme-secondary"
              aria-label="GitHub"
            >
              <Code className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={toggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-muted transition-all hover:bg-theme-surface hover:text-theme-secondary"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-tertiary transition-colors hover:bg-theme-surface hover:text-theme md:hidden"
            onClick={() => {
              if (isDocs) {
                setDrawerOpen(!drawerOpen)
              } else {
                setMobileOpen(!mobileOpen)
              }
            }}
          >
            {isDocs ? (
              drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />
            ) : (
              mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {!isDocs && mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-theme nav-blur md:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                <button
                  onClick={() => { setSearchOpen(true); setMobileOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                >
                  <Search className="h-4 w-4" />
                  Search
                  <kbd className="ml-auto rounded border border-theme-hover bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted">⌘K</kbd>
                </button>
                <Link
                  to="/docs/getting-started/quick-start"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </Link>
                <Link
                  to="/projects"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <Layers className="h-4 w-4" />
                  Projects
                </Link>
                <Link
                  to="/docs/torque/overview"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <Code className="h-4 w-4" />
                  Torque
                </Link>
                <Link
                  to="/about"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  About
                </Link>
                <Link
                  to="/feedback"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <MessageSquareText className="h-4 w-4" />
                  Feedback
                </Link>
                <Link
                  to="/faq"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <HelpCircle className="h-4 w-4" />
                  FAQ
                </Link>
                <Link
                  to="/privacy"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  Privacy
                </Link>
                <a
                  href={import.meta.env.VITE_GITHUB_URL || 'https://github.com/Jay-Suryawansh7/solarch'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                  onClick={() => setMobileOpen(false)}
                >
                  <Code className="h-4 w-4" />
                  GitHub
                </a>
                <button
                  onClick={() => { toggle(); setMobileOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-secondary transition-colors hover:bg-theme-surface hover:text-theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
