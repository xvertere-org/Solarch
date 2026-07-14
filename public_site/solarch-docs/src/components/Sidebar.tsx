import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight, X } from 'lucide-react'
import { navigation, type NavItem } from '../data/navigation'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

function isPathActive(locationPath: string, itemPath: string) {
  return locationPath === itemPath
}

function isPathInSection(locationPath: string, itemPath: string) {
  return locationPath.startsWith(itemPath + '/')
}

function hasActiveChild(locationPath: string, item: NavItem): boolean {
  if (!item.children || item.children.length === 0) return false
  return item.children.some(
    (child) =>
      isPathActive(locationPath, child.path) ||
      isPathInSection(locationPath, child.path) ||
      hasActiveChild(locationPath, child)
  )
}

function NavTreeItem({
  item,
  depth = 0,
  searchQuery,
  locationPath,
  forceExpand,
}: {
  item: NavItem
  depth?: number
  searchQuery: string
  locationPath: string
  forceExpand?: boolean
}) {
  const isActive = isPathActive(locationPath, item.path)
  const isSectionActive = isPathInSection(locationPath, item.path)
  const hasChildren = item.children && item.children.length > 0
  const childIsActive = hasActiveChild(locationPath, item)

  const [userExpanded, setUserExpanded] = useState(
    isSectionActive || isActive || childIsActive
  )
  const expanded = forceExpand ? true : userExpanded

  const query = searchQuery.trim().toLowerCase()
  const matchesSelf = item.label.toLowerCase().includes(query)
  const childMatches = hasChildren
    ? item.children!.some((c) => c.label.toLowerCase().includes(query))
    : false
  const isVisible = query === '' || matchesSelf || childMatches

  if (!isVisible) return null

  return (
    <div>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setUserExpanded((p) => !p)}
            className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-theme-muted hover:text-theme-secondary"
          >
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.div>
          </button>
        )}
        {!hasChildren && <span className="mr-1 h-5 w-5 shrink-0" />}
        <Link
          to={item.path}
          data-active={isActive ? 'true' : undefined}
          className={`relative flex-1 truncate rounded-r-md py-1.5 pr-2 text-sm transition-colors ${
            isActive
              ? 'font-medium text-primary'
              : 'text-theme-tertiary hover:text-theme-secondary'
          } ${depth > 0 ? 'pl-0' : 'pl-2'}`}
        >
          {isActive && (
            <span className="absolute left-[-12px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
          )}
          {item.label}
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children!.map((child) => (
              <li key={child.id} className="ml-5 border-l border-theme">
                <NavTreeItem
                  item={child}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  locationPath={locationPath}
                  forceExpand={forceExpand}
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const navRef = useRef<HTMLElement>(null)

  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return navigation
    const q = searchQuery.trim().toLowerCase()
    return navigation
      .map((section) => {
        const sectionMatches = section.label.toLowerCase().includes(q)
        const filteredChildren = section.children?.filter((c) =>
          c.label.toLowerCase().includes(q)
        )
        if (sectionMatches) return section
        if (filteredChildren && filteredChildren.length > 0) {
          return { ...section, children: filteredChildren }
        }
        return null
      })
      .filter(Boolean) as NavItem[]
  }, [searchQuery])

  const isSearching = searchQuery.trim().length > 0

  // Scroll active sidebar item into view
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const activeLink = nav.querySelector('[data-active="true"]') as HTMLElement | null
    if (!activeLink) return

    const navRect = nav.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()

    const isAbove = linkRect.top < navRect.top + 8
    const isBelow = linkRect.bottom > navRect.bottom - 8

    if (isAbove || isBelow) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [location.pathname])

  const handleLinkClick = useCallback(() => {
    onCloseMobile()
  }, [onCloseMobile])

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] transform border-r border-theme bg-theme-body transition-transform duration-300 ease-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-end border-b border-theme px-4 py-3">
            <button
              onClick={onCloseMobile}
              className="rounded p-1 text-theme-tertiary hover:bg-theme-surface hover:text-theme lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-muted" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-theme bg-dark py-1.5 pl-8 pr-3 text-sm text-theme placeholder:text-theme-muted focus:border-primary/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Nav tree */}
          <nav
            ref={navRef}
            className="flex-1 overflow-y-auto px-3 py-3"
            onClick={handleLinkClick}
          >
            <div className="space-y-0.5">
              {filteredNav.map((item) => (
                <NavTreeItem
                  key={item.id}
                  item={item}
                  searchQuery={searchQuery}
                  locationPath={location.pathname}
                  forceExpand={isSearching}
                />
              ))}
              {filteredNav.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-theme-muted">No results found</p>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
