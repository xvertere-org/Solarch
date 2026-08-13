import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Database, Settings, LogOut, FileText,
  Archive, Bot, Menu
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { SolarchLogo } from '@/components/SolarchLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
  admin: any
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/collections', icon: Database, label: 'Collections' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/backups', icon: Archive, label: 'Backups' },
  { path: '/ai', icon: Bot, label: 'AI Assistant' },
]

export default function Layout({ children, onLogout, admin }: LayoutProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentPage = navItems.find(n => n.path === location.pathname)

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full bg-[#150d08]">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#3a2214]">
          <SolarchLogo className="w-8 h-8" />
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-[#fdf3ec] font-display">Solarch</span>
            <span className="text-[10px] uppercase font-mono font-bold text-[#ff5a1f] bg-[#ff5a1f]/15 border border-[#ff5a1f]/30 px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
        </div>

        {/* Nav List */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#ff5a1f] text-white font-semibold shadow-md shadow-[#ff5a1f]/20'
                    : 'text-[#c9a894] hover:bg-[#1f140d] hover:text-white'
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Footer Profile Bar */}
      <div className="p-4 border-t border-[#3a2214] flex items-center justify-between gap-3 bg-[#150d08]">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#ff5a1f] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
            {(admin?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden min-w-0">
            <div className="text-xs font-semibold text-[#fdf3ec] truncate">
              {admin?.email?.split('@')[0] || 'Admin'}
            </div>
            <div className="text-[11px] text-[#8b6d5b] truncate">
              {admin?.email || ''}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          title="Sign Out"
          aria-label="Sign out"
          className="text-[#c9a894] hover:text-[#ef4444] hover:bg-[#ef4444]/15 rounded-lg shrink-0 transition-colors"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#0d0905] text-[#fdf3ec]">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#ff5a1f] focus:text-white rounded-md font-medium text-xs"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (>= 768px) */}
      <aside className="w-64 border-r border-[#3a2214] bg-[#150d08] hidden md:flex flex-col justify-between shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Sheet Drawer (< 768px) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r border-[#3a2214] bg-[#150d08] text-[#fdf3ec]">
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#3a2214] bg-[#150d08]/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-[#c9a894] hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </Button>
            <div className="text-sm font-semibold text-[#fdf3ec] font-display">
              {currentPage?.label || 'Admin'}
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto bg-[#0d0905]">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  )
}
