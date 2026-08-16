import { useEffect, useState, useCallback } from 'react'
import { adminApi, LogItem } from '@/lib/admin-api'
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Activity,
  Copy,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Logs() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const perPage = 50
  const [levelFilter, setLevelFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedPayload, setCopiedPayload] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      setError(null)
      const res = await adminApi.logs.getList(page, perPage, levelFilter, search)
      setLogs(res.items || [])
      setTotalItems(res.totalItems || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err: any) {
      console.error('Fetch logs error:', err)
      setError(err.message || 'Failed to retrieve logs.')
      toast.error('Failed to retrieve logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, perPage, levelFilter, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      fetchLogs()
    }, 4000)
    return () => clearInterval(timer)
  }, [autoRefresh, fetchLogs])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  const handleCopyPayload = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopiedPayload(true)
    toast.success('Log payload copied')
    setTimeout(() => setCopiedPayload(false), 2000)
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'destructive'
      case 'warn':
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Logs" description="HTTP requests, errors, and audit events." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error && logs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Logs" description="HTTP requests, errors, and audit events." />
        <ErrorState title="Unable to load logs" message={error} onRetry={fetchLogs} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <PageHeader
        title="Logs"
        description="Live request telemetry, internal runtime logs, and audit trails."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-8 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Activity size={13} className={cn(autoRefresh && 'animate-pulse')} />
              <span>{autoRefresh ? 'Live Streaming' : 'Live Stream'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* 2. Logs Table Card */}
      <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
        {/* Table Filters */}
        <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              Log Records
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
              {totalItems}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Search log messages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-8 h-8 text-xs w-44 sm:w-60"
              />
            </div>

            <Select
              value={levelFilter}
              onValueChange={(val) => {
                setLevelFilter(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table View */}
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search ? 'No matching logs' : 'No logs recorded'}
              message={
                search
                  ? `No logs match the query "${search}".`
                  : 'System activity and API requests will appear here as they occur.'
              }
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-elevated/40">
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary w-24">Level</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Message</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary w-44">Timestamp</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary text-right w-20">Inspect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow
                      key={log.id || i}
                      className="border-b border-border/40 hover:bg-bg-surface-hover/50 transition-colors group"
                    >
                      <TableCell className="py-2">
                        <Badge
                          variant={getLevelBadgeVariant(log.level)}
                          className="text-[10px] uppercase font-mono px-1.5 py-0.5"
                        >
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs text-text-primary max-w-xl truncate">
                        {log.message}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-[11px] text-text-muted">
                        {new Date(log.created).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 px-2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/50 bg-bg-surface flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Page {page} of {totalPages} ({totalItems} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open: boolean) => !open && setSelectedLog(null)}>
        <DialogContent className="p-6 space-y-4 max-w-2xl">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={selectedLog ? getLevelBadgeVariant(selectedLog.level) : 'secondary'}>
                {selectedLog?.level.toUpperCase()}
              </Badge>
              <DialogTitle>Log Details</DialogTitle>
            </div>
            <DialogDescription>
              {selectedLog?.created ? new Date(selectedLog.created).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-bg-elevated border border-border">
              <span className="text-[11px] text-text-muted block mb-1">Message</span>
              <p className="font-mono text-xs text-text-primary leading-relaxed select-text">
                {selectedLog?.message}
              </p>
            </div>

            {selectedLog?.data && Object.keys(selectedLog.data).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">Payload Data</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(selectedLog.data)}
                    className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    {copiedPayload ? <Check size={11} className="text-status-success" /> : <Copy size={11} />}
                    <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-bg-void border border-border font-mono text-[11px] text-text-secondary overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
