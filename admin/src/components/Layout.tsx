import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Database, Settings, LogOut, FileText,
  Archive, Bot
} from 'lucide-react'
import { ReactNode } from 'react'

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
  const currentPage = navItems.find(n => n.path === location.pathname)

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img
            src="/solarch-logo.png"
            alt="Solarch"
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }}
          />
          <span className="logo-text">
            Tspoon<span className="base">Base</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(admin?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {admin?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="sidebar-user-email">
                {admin?.email || ''}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-title">
            {currentPage?.label || 'Admin'}
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
