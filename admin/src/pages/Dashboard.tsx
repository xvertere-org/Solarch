import { useEffect, useState } from 'react'
import { solarch } from '../lib/solarch'
import { Database, HardDrive, Users, Zap, Settings as SettingsIcon, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { StatCard } from '@/components/domain/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SolarchLogo } from '@/components/SolarchLogo'

export default function Dashboard() {
  const [stats, setStats] = useState({ collections: 0, records: 0, users: 0 })
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const collections = await solarch.collections.getList()
        let totalRecords = 0
        let totalUsers = 0
        for (const c of collections.items || []) {
          try {
            const recs = await solarch.collection(c.id).getList(1, 1, { skipTotal: false })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner className="w-8 h-8 text-[#ff5a1f]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Solarch Backend-as-a-Service Overview."
      />

      {/* Brand Hero Console Banner */}
      <Card className="bg-[#150d08] border-[#3a2214] relative overflow-hidden shadow-lg">
        <div className="absolute -right-12 -bottom-12 opacity-[0.07] pointer-events-none">
          <SolarchLogo className="w-72 h-72" />
        </div>
        <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 text-[#ff5a1f] shrink-0">
              <SolarchLogo className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-[#fdf3ec]">
                  Solarch Backend Console
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#ff5a1f]/20 text-[#ff9854] border border-[#ff5a1f]/30 font-semibold">
                  v0.4.2 Active
                </span>
              </div>
              <p className="text-sm text-[#c9a894] max-w-xl">
                TypeScript Backend-as-a-Service with SQLite database, Express REST APIs, WebSockets, File Storage, and AI Integration.
              </p>
            </div>
          </div>
          <Link to="/collections" className="shrink-0">
            <Button className="bg-[#ff5a1f] hover:bg-[#ff7a1a] text-white font-medium px-4 py-2">
              <Database size={16} className="mr-2" /> Explore Collections
            </Button>
          </Link>
        </CardContent>
      </Card>

      {showWelcome && (
        <Card className="bg-[#150d08] border-[#ff5a1f]/30">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-[#ff5a1f] text-white shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#fdf3ec]">Welcome to Solarch!</h3>
              <p className="text-sm text-[#c9a894] mt-1">
                Get started by creating your first database collection to store structured records.
              </p>
              <Link to="/collections">
                <Button className="mt-4 bg-[#ff5a1f] hover:bg-[#ff7a1a] text-white">
                  Create First Collection <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Collections"
          value={stats.collections}
          icon={<Database size={20} className="text-[#ff5a1f]" />}
          description="Active database tables"
        />
        <StatCard
          title="Total Records"
          value={stats.records}
          icon={<HardDrive size={20} className="text-[#10b981]" />}
          description="Stored documents & rows"
        />
        <StatCard
          title="Auth Users"
          value={stats.users}
          icon={<Users size={20} className="text-[#f59e0b]" />}
          description="Registered user accounts"
        />
      </div>

      {/* Action Shortcut Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/collections" className="group">
          <Card className="bg-[#150d08] border-[#3a2214] transition-all hover:border-[#ff5a1f]/50 hover:bg-[#1f140d] h-full">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#fdf3ec] group-hover:text-[#ff9854] transition-colors font-display">
                <Database size={18} className="text-[#ff5a1f]" />
                Manage Collections & Schemas
              </div>
              <p className="text-sm text-[#c9a894]">
                Define database collections, specify field types, and set API access rules.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings" className="group">
          <Card className="bg-[#150d08] border-[#3a2214] transition-all hover:border-[#ff5a1f]/50 hover:bg-[#1f140d] h-full">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#fdf3ec] group-hover:text-[#ff9854] transition-colors font-display">
                <SettingsIcon size={18} className="text-[#ff5a1f]" />
                System & AI Settings
              </div>
              <p className="text-sm text-[#c9a894]">
                Configure OpenAI/Anthropic API keys, system metadata, and SMTP mailer parameters.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
