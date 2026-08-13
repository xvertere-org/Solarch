import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLogs() }, [page])

  async function loadLogs() {
    setLoading(true)
    try {
      const data = await api.get(`/api/logs?page=${page}&perPage=${perPage}`)
      setLogs(data.items || []); setTotalItems(data.totalItems || 0)
    } catch (err: any) { console.error('Failed to load logs', err) }
    finally { setLoading(false) }
  }

  const totalPages = Math.ceil(totalItems / perPage)

  const badgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive'
      case 'warn': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="Audit requests, errors, and system activity events."
      />

      <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] overflow-hidden">
        {logs.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
            <div className="p-4 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              <FileText size={36} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">No logs recorded yet.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Timestamp</TableHead>
                <TableHead className="w-28">Level</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(log.created).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant(log.level)}>
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">
                    {log.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--bg-border)]">
            <span className="text-xs text-[var(--text-muted)]">
              Page {page} of {totalPages} ({totalItems} total logs)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
