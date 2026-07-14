import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Database, HardDrive, Users, Zap, Settings as SettingsIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState({ collections: 0, records: 0, users: 0 })
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const collections = await api.get('/api/collections')
        let totalRecords = 0
        let totalUsers = 0
        for (const c of collections.items || []) {
          try {
            const recs = await api.get(`/api/collections/${c.id}/records?page=1&perPage=1&skipTotal=false`)
            totalRecords += recs.totalItems || 0
            if (c.type === 'auth') totalUsers += recs.totalItems || 0
          } catch { /* ignore */ }
        }
        setStats({ collections: collections.items?.length || 0, records: totalRecords, users: totalUsers })
        if (collections.items?.length === 0) setShowWelcome(true)
      } catch (err: any) { console.error('Dashboard load failed', err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div className="empty-state"><div className="spinner" /></div>

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Dashboard</h2>

      {showWelcome && (
        <div className="welcome-banner">
          <div className="welcome-icon"><Zap size={22} color="#fff" /></div>
          <div>
            <h3>Welcome to Solarch!</h3>
            <p>Get started by creating your first collection to store data.</p>
            <Link to="/collections" className="btn btn-primary" style={{ marginTop: 12 }}>
              Create First Collection
            </Link>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(26,111,255,0.15)' }}>
            <Database size={18} style={{ color: 'var(--blue-bright)' }} />
          </div>
          <div className="stat-value">{stats.collections}</div>
          <div className="stat-label">Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,230,118,0.15)' }}>
            <HardDrive size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-value">{stats.records}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,179,0,0.15)' }}>
            <Users size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Auth Users</div>
        </div>
      </div>

      <div className="action-grid">
        <Link to="/collections" className="action-card">
          <div className="action-title">
            <Database size={16} style={{ color: 'var(--blue-bright)' }} />
            Manage Collections
          </div>
          <div className="action-desc">Create and configure collections to organize your data.</div>
        </Link>
        <Link to="/settings" className="action-card">
          <div className="action-title">
            <SettingsIcon size={16} style={{ color: 'var(--blue-bright)' }} />
            Settings
          </div>
          <div className="action-desc">Configure app settings, AI options, and more.</div>
        </Link>
      </div>
    </div>
  )
}
