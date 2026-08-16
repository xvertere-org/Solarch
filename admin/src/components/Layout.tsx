import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Settings,
  LogOut,
  FileText,
  Archive,
  Bot,
  PanelLeft,
  Shield,
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { SolarchLogo } from '@/components/SolarchLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
  admin: any
}

interface NavGroup {
  label: string
  items: {
    path: string
    icon: any
    label: string
  }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Data',
    items: [
      { path: '/collections', icon: Database, label: 'Collections' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/logs', icon: FileText, label: 'Logs' },
      { path: '/backups', icon: Archive, label: 'Backups' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/ai', icon: Bot, label: 'AI Assistant' },
    ],
  },
]

const allNavItems = navGroups.flatMap((g) => g.items)

export default function Layout({ children, onLogout, admin }: LayoutProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const currentPage = allNavItems.find((n) => n.path === location.pathname)

  const displayName = admin?.username || admin?.email?.split('@')[0] || 'admin'
  const displaySub = admin?.email || (admin?.username ? `@${admin.username}` : '@admin')
  const initial = displayName.charAt(0).toUpperCase()

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full overflow-hidden">
      {/* Top Section (Brand + Nav) */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-14 flex items-center gap-3 px-3 shrink-0">
          <SolarchLogo className="w-6 h-6 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight text-text-primary font-display">
              Solarch
            </span>
          </div>
        </div>

        {/* Grouped Nav List with smooth scroll */}
        <nav className="p-1 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted px-2.5 py-0.5">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary',
                        isActive
                          ? 'bg-brand-primary/10 text-brand-primary font-medium border border-brand-primary/20'
                          : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary font-normal'
                      )}
                    >
                      <item.icon
                        size={16}
                        className={cn(
                          'shrink-0 transition-colors',
                          isActive ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-secondary'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer Profile Bar - Pinned at bottom of sidebar */}
      <div className="p-2 border-t border-border/30 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-black text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
            {initial}
          </div>
          <div className="overflow-hidden min-w-0">
            <div className="text-xs font-medium text-text-primary truncate flex items-center gap-1">
              <span className="truncate">{displayName}</span>
              <Shield size={11} className="text-brand-primary shrink-0" />
            </div>
            <div className="text-[11px] text-text-muted truncate font-mono">
              {displaySub}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          title="Sign Out"
          aria-label="Sign out"
          className="h-8 w-8 p-0 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-md shrink-0 transition-colors"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="h-screen h-dvh flex bg-bg-void text-text-primary overflow-hidden p-2 md:p-3 gap-2 md:gap-3">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-brand-primary focus:text-black rounded text-xs font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop Inset Sidebar (>= 768px) with Smooth Collapse Transition */}
      <aside
        className={cn(
          'bg-bg-void hidden md:flex flex-col justify-between shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out',
          desktopCollapsed
            ? 'w-0 opacity-0 -mr-2 md:-mr-3 pointer-events-none'
            : 'w-56 opacity-100'
        )}
        aria-hidden={desktopCollapsed}
      >
        <div className="w-56 h-full flex flex-col justify-between overflow-hidden">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Mobile Sidebar Sheet Drawer (< 768px) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r border-border bg-bg-surface text-text-primary">
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      {/* Inset Main Content Panel with Curved Edges & Clean Margins */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden rounded-xl md:rounded-2xl border border-border/60 bg-bg-surface shadow-sm">
        {/* Inset Top Header with PanelLeft trigger & breadcrumb */}
        <header className="h-14 border-b border-border/50 bg-bg-surface/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="md:hidden h-8 w-8 p-0 text-text-secondary hover:text-text-primary"
              aria-label="Open navigation menu"
            >
              <PanelLeft size={18} />
            </Button>
            {/* Desktop sidebar toggle trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              className="hidden md:flex h-8 w-8 p-0 text-text-secondary hover:text-text-primary"
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={18} />
            </Button>

            <span className="text-xs text-text-muted">/</span>

            <span className="text-sm font-semibold text-text-primary font-display tracking-tight">
              {currentPage?.label || 'Admin'}
            </span>
          </div>
        </header>

        {/* Main Content Body with Hidden Scrollbar */}
        <main id="main-content" className="flex-1 overflow-y-auto no-scrollbar bg-bg-surface">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  )
}
