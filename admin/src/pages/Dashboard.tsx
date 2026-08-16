import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { solarch } from '@/lib/solarch'
import { adminApi, AdminMetricsResponse } from '@/lib/admin-api'
import {
  Database,
  HardDrive,
  Users,
  ArrowRight,
  RefreshCw,
  Plus,
  Archive,
  Bot,
  ShieldCheck,
  Zap,
  Server,
  Key,
  Activity,
  Cpu,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { StatCard } from '@/components/domain/StatCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface CollectionItem {
  id: string
  name: string
  type: string
  system?: boolean
  recordCount?: number
}

interface DashboardStats {
  collections: number
  records: number
  users: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ collections: 0, records: 0, users: 0 })
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [capabilities, setCapabilities] = useState<{ engine?: string; provider?: string; realtime?: boolean }>({
    engine: 'SQLite 3 (WAL)',
    provider: 'sqlite',
    realtime: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null)

      // Fetch capabilities
      try {
        const caps = await solarch.capabilities.get()
        if (caps) {
          setCapabilities({
            engine: caps.engine || 'SQLite 3 (WAL)',
            provider: caps.engine || 'sqlite',
            realtime: true,
          })
        }
      } catch {
        // Fallback to defaults
      }

      // Fetch collections
      const colsResponse = await solarch.collections.getList(1, 100)
      const colsList = colsResponse.items || []

      // Fetch metrics via adminApi
      let metrics: AdminMetricsResponse = {
        totalCollections: colsList.length,
        totalRecords: 0,
        totalAuthUsers: 0,
      }

      try {
        metrics = await adminApi.metrics.get()
      } catch {
        // Fallback: calculate from collections list
        let totalRecords = 0
        let totalUsers = 0
        for (const col of colsList) {
          try {
            const recs = await solarch.collection(col.id).getList(1, 1, { skipTotal: false })
            totalRecords += recs.totalItems || 0
            if (col.type === 'auth') totalUsers += recs.totalItems || 0
          } catch {
            // Ignore individual table errors
          }
        }
        metrics = {
          totalCollections: colsList.length,
          totalRecords,
          totalAuthUsers: totalUsers,
        }
      }

      setStats({
        collections: metrics.totalCollections ?? colsList.length,
        records: metrics.totalRecords ?? 0,
        users: metrics.totalAuthUsers ?? 0,
      })

      // Map collections for overview table
      const formattedCols: CollectionItem[] = colsList.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'base',
        system: c.system || false,
      }))

      setCollections(formattedCols)
    } catch (err: any) {
      console.error('Dashboard data load error:', err)
      setError(err.message || 'Failed to load dashboard overview.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  // Quick Action navigation links
  const adminActions = [
    {
      title: 'Collections & Schemas',
      description: 'Manage data models, indexes, and schema fields',
      icon: Database,
      path: '/collections',
      actionText: 'Manage',
    },
    {
      title: 'System Backups',
      description: 'Create snapshots and restore database state',
      icon: Archive,
      path: '/backups',
      actionText: 'Backups',
    },
    {
      title: 'Access & System Logs',
      description: 'Monitor live request logs and system events',
      icon: HardDrive,
      path: '/logs',
      actionText: 'View Logs',
    },
    {
      title: 'AI Schema Assistant',
      description: 'Generate schemas and seed data using LLMs',
      icon: Bot,
      path: '/ai',
      actionText: 'Launch AI',
    },
    {
      title: 'Platform Settings',
      description: 'Configure mail, storage, tokens, and rate limits',
      icon: Zap,
      path: '/settings',
      actionText: 'Settings',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Solarch Backend-as-a-Service Overview."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Solarch Backend-as-a-Service Overview."
        />
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header with Refresh Action */}
      <PageHeader
        title="Dashboard"
        description="Solarch Backend-as-a-Service Overview."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary h-8"
          >
            <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Collections"
          value={stats.collections}
          icon={<Database size={18} />}
        />
        <StatCard
          title="Total Records"
          value={stats.records}
          icon={<HardDrive size={18} />}
        />
        <StatCard
          title="Admin / Auth Users"
          value={stats.users}
          icon={<Users size={18} />}
        />
      </div>

      {/* Main Grid: Left = Collections Overview Table, Right = Quick Links & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections Overview (2 Columns on Large Screens) */}
        <Card className="lg:col-span-2 border border-border/60 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold font-display text-text-primary">
                  Collections Directory
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-0.5">
                  Schema definitions and table configurations
                </CardDescription>
              </div>
              <Link to="/collections">
                <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1">
                  <Plus size={12} /> New Collection
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {collections.length === 0 ? (
                <EmptyState
                  icon={<Database size={24} />}
                  title="No collections created yet"
                  message="Create your first schema collection to start persisting and querying records."
                  action={
                    <Link to="/collections">
                      <Button size="sm" variant="default" className="text-xs mt-2">
                        Create Collection
                      </Button>
                    </Link>
                  }
                  className="py-12"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-bg-elevated/40">
                      <TableRow className="border-b border-border/50 hover:bg-transparent">
                        <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Name</TableHead>
                        <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Type</TableHead>
                        <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Scope</TableHead>
                        <TableHead className="h-9 text-[11px] font-semibold text-text-secondary text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collections.slice(0, 6).map((col) => (
                        <TableRow
                          key={col.id}
                          className="border-b border-border/40 hover:bg-bg-surface-hover/50 transition-colors group"
                        >
                          <TableCell className="py-2.5 font-mono text-xs text-text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Database size={13} className="text-text-muted group-hover:text-brand-primary transition-colors" />
                              <Link
                                to={`/records/${col.id}`}
                                className="hover:text-brand-bright hover:underline transition-colors"
                              >
                                {col.name}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant={col.type === 'auth' ? 'accent' : 'secondary'}
                              className="text-[10px] uppercase font-mono px-2 py-0.5"
                            >
                              {col.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {col.system ? (
                              <span className="text-[10px] font-mono text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded border border-status-warning/20">
                                system
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-text-muted">
                                user
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <Link
                              to={`/records/${col.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary hover:text-brand-bright transition-colors"
                            >
                              <span>Browse</span>
                              <ArrowRight size={12} />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>

          {collections.length > 6 && (
            <CardFooter className="p-3 px-5 border-t border-border/50 bg-bg-surface flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Showing 6 of {collections.length} collections
              </span>
              <Link
                to="/collections"
                className="text-xs font-semibold text-brand-primary hover:text-brand-bright flex items-center gap-1"
              >
                View all collections <ArrowRight size={13} />
              </Link>
            </CardFooter>
          )}
        </Card>

        {/* System Health & Status (1 Column) */}
        <Card className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
                <Activity size={16} className="text-status-success" />
                <span>System Health</span>
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Runtime operational status & metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-status-success/10 border border-status-success/20 text-status-success shrink-0">
                    <Server size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary">API Gateway</div>
                    <div className="text-[10px] text-text-muted font-mono truncate">Ready & Healthy</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/20 shrink-0 ml-2">
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-status-info/10 border border-status-info/20 text-status-info shrink-0">
                    <HardDrive size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary">Database Engine</div>
                    <div className="text-[10px] text-text-muted font-mono truncate">{capabilities.engine}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-status-info/10 text-status-info border border-status-info/20 shrink-0 ml-2 uppercase">
                  {capabilities.provider}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0">
                    <Zap size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary">Realtime & SSE</div>
                    <div className="text-[10px] text-text-muted font-mono truncate">Stream Engine Active</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0 ml-2">
                  SSE
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-status-success/10 border border-status-success/20 text-status-success shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary">Security Layer</div>
                    <div className="text-[10px] text-text-muted font-mono truncate">JWT & Superuser Guard</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/20 shrink-0 ml-2">
                  Active
                </span>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Quick Actions + Environment Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (2 Columns) */}
        <Card className="lg:col-span-2 border border-border/60 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
                <Zap size={16} className="text-brand-primary" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Common administrative operations & shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {adminActions.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-bg-surface hover:bg-bg-elevated hover:border-brand-primary/30 transition-all group focus-visible:ring-1 focus-visible:ring-brand-primary"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md border border-border/60 bg-bg-elevated text-text-secondary group-hover:text-brand-primary group-hover:border-brand-primary/30 shrink-0 transition-colors">
                      <item.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary group-hover:text-brand-bright transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-text-muted truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-bg-elevated border border-border text-text-secondary group-hover:border-brand-primary/30 group-hover:text-brand-primary transition-colors shrink-0 ml-2">
                    {item.actionText}
                  </span>
                </Link>
              ))}
            </CardContent>
          </div>
        </Card>

        {/* System Environment */}
        <Card className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
                <Cpu size={16} className="text-brand-primary" />
                <span>System Environment</span>
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Server runtime & capability matrix
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <span className="text-xs text-text-muted">Core Version</span>
                <span className="font-mono text-xs text-text-primary font-semibold">v0.16.0</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <span className="text-xs text-text-muted">Database Engine</span>
                <span className="font-mono text-xs text-text-secondary">{capabilities.engine}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <span className="text-xs text-text-muted">Realtime Channel</span>
                <span className="font-mono text-xs text-status-success font-medium">SSE / WS Ready</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-bg-surface">
                <span className="text-xs text-text-muted">Admin Access</span>
                <span className="font-mono text-xs text-status-success font-medium flex items-center gap-1.5">
                  <Key size={12} /> Superuser
                </span>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
