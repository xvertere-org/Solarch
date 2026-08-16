import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { solarch } from '@/lib/solarch'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Edit,
  RefreshCw,
  Database,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Collection {
  id: string
  name: string
  type: string
  system?: boolean
  schema: any[]
}

export default function Records() {
  const { collectionId } = useParams<{ collectionId: string }>()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const perPage = 20
  const [search, setSearch] = useState('')
  const sort = '-created'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({})
  const [creating, setCreating] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const fetchRecords = useCallback(async () => {
    if (!collectionId) return
    try {
      setError(null)

      // 1. Fetch collection definition
      const colData: any = await solarch.collections.getOne(collectionId)
      setCollection(colData)

      // 2. Fetch records
      const options: any = {
        sort,
      }
      if (search.trim()) {
        // Simple search query or filter string
        if (search.includes('=') || search.includes('~') || search.includes('>')) {
          options.filter = search.trim()
        }
      }

      const res = await solarch.collection(collectionId).getList(page, perPage, options)
      setRecords(res.items || [])
      setTotalItems(res.totalItems || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err: any) {
      console.error('Failed to fetch records:', err)
      setError(err.message || 'Failed to load records.')
      toast.error('Failed to load records')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [collectionId, page, perPage, sort, search])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchRecords()
  }

  // Schema columns to display (up to 5 columns)
  const displayColumns = useMemo(() => {
    if (!collection || !collection.schema) return []
    return collection.schema.slice(0, 5)
  }, [collection])

  // Select all toggle
  const allSelected = records.length > 0 && selectedIds.length === records.length
  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map((r) => r.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Handlers
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectionId || creating) return

    try {
      setCreating(true)
      await solarch.collection(collectionId).create(newRecordData)
      toast.success('Record created successfully')
      setShowCreateModal(false)
      setNewRecordData({})
      await fetchRecords()
    } catch (err: any) {
      console.error('Create record failed:', err)
      toast.error(err.message || 'Failed to create record')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!collectionId || !deleteTarget || deleting) return

    try {
      setDeleting(true)
      await solarch.collection(collectionId).delete(deleteTarget.id)
      toast.success('Record deleted')
      setDeleteTarget(null)
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id))
      await fetchRecords()
    } catch (err: any) {
      console.error('Delete record failed:', err)
      toast.error(err.message || 'Failed to delete record')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!collectionId || selectedIds.length === 0 || bulkDeleting) return

    try {
      setBulkDeleting(true)
      for (const recId of selectedIds) {
        try {
          await solarch.collection(collectionId).delete(recId)
        } catch {
          // Continue
        }
      }
      toast.success(`Deleted ${selectedIds.length} records`)
      setSelectedIds([])
      setShowBulkDeleteConfirm(false)
      await fetchRecords()
    } catch (err: any) {
      console.error('Bulk delete failed:', err)
      toast.error('Bulk delete encountered an issue')
    } finally {
      setBulkDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Records" description="Persistent collection records." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error && records.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Records" description="Persistent collection records." />
        <ErrorState title="Unable to load records" message={error} onRetry={fetchRecords} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Create Action */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to="/collections"
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <span>{collection?.name || 'Collection Records'}</span>
            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5 ml-1">
              {totalItems} records
            </Badge>
          </div>
        }
        description={`Collection: ${collection?.id || collectionId}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setNewRecordData({})
                setShowCreateModal(true)
              }}
              className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
            >
              <Plus size={13} />
              <span>New Record</span>
            </Button>
          </div>
        }
      />

      {/* 2. Records Table Card */}
      <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
        {/* Table Controls */}
        <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="h-8 text-xs text-status-danger hover:bg-status-danger/10 border-status-danger/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Filter expression..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-8 h-8 text-xs w-44 sm:w-64"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0 text-text-muted hover:text-text-primary cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        {/* Table View */}
        <CardContent className="p-0">
          {records.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No records found"
              message="This collection does not contain any records yet."
              action={
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs mt-2"
                >
                  Create Record
                </Button>
              }
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-elevated/40">
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="w-9 h-9 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">ID</TableHead>
                    {displayColumns.map((col) => (
                      <TableHead key={col.id} className="h-9 text-[11px] font-semibold text-text-secondary">
                        {col.name}
                      </TableHead>
                    ))}
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Created</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow
                      key={rec.id}
                      className="border-b border-border/40 hover:bg-bg-surface-hover/50 transition-colors group"
                    >
                      <TableCell className="py-2.5 text-center">
                        <Checkbox
                          checked={selectedIds.includes(rec.id)}
                          onCheckedChange={() => handleToggleSelect(rec.id)}
                          aria-label={`Select record ${rec.id}`}
                        />
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-text-primary font-medium">
                        <Link
                          to={`/records/${collectionId}/${rec.id}`}
                          className="hover:text-brand-bright hover:underline"
                        >
                          {rec.id}
                        </Link>
                      </TableCell>
                      {displayColumns.map((col) => (
                        <TableCell key={col.id} className="py-2.5 text-xs text-text-secondary max-w-[200px] truncate">
                          {typeof rec[col.name] === 'object'
                            ? JSON.stringify(rec[col.name])
                            : String(rec[col.name] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="py-2.5 font-mono text-[11px] text-text-muted">
                        {rec.created ? new Date(rec.created).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/records/${collectionId}/${rec.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit size={13} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(rec)}
                            className="h-7 px-2 text-xs text-status-danger hover:bg-status-danger/10 cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
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

      {/* 3. Create Record Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5">
            <DialogTitle>New Record</DialogTitle>
            <DialogDescription>
              Add a new record to the <span className="font-mono">{collection?.name}</span> collection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecord} className="space-y-3.5">
            {collection?.type === 'auth' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-secondary">Email / Username</Label>
                  <Input
                    required
                    value={newRecordData.email || ''}
                    onChange={(e) => setNewRecordData({ ...newRecordData, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-secondary">Password</Label>
                  <Input
                    type="password"
                    required
                    value={newRecordData.password || ''}
                    onChange={(e) => setNewRecordData({ ...newRecordData, password: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-secondary">Password Confirm</Label>
                  <Input
                    type="password"
                    required
                    value={newRecordData.passwordConfirm || ''}
                    onChange={(e) => setNewRecordData({ ...newRecordData, passwordConfirm: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {collection?.schema?.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">
                  {field.name} {field.required && <span className="text-status-danger">*</span>}
                </Label>
                {field.type === 'bool' ? (
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <Checkbox
                      checked={!!newRecordData[field.name]}
                      onCheckedChange={(checked) =>
                        setNewRecordData({ ...newRecordData, [field.name]: !!checked })
                      }
                    />
                    <span>True / Enabled</span>
                  </label>
                ) : field.type === 'json' ? (
                  <Textarea
                    value={
                      typeof newRecordData[field.name] === 'object'
                        ? JSON.stringify(newRecordData[field.name], null, 2)
                        : newRecordData[field.name] || ''
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setNewRecordData({ ...newRecordData, [field.name]: parsed })
                      } catch {
                        setNewRecordData({ ...newRecordData, [field.name]: e.target.value })
                      }
                    }}
                    placeholder="{}"
                    className="font-mono text-xs h-20"
                  />
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'}
                    required={field.required}
                    value={newRecordData[field.name] || ''}
                    onChange={(e) =>
                      setNewRecordData({
                        ...newRecordData,
                        [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ))}

            <DialogFooter className="pt-2 border-t border-border gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={creating} className="text-xs h-9">
                {creating ? 'Saving...' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Record AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="p-6 space-y-4">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger border border-status-danger/20 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-semibold text-text-primary">
                  Delete Record
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  Permanently remove record <span className="font-mono font-bold">{deleteTarget?.id}</span>.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)} className="text-xs h-9 px-4">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} variant="destructive" className="text-xs h-9 px-4">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 5. Bulk Delete AlertDialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="p-6 space-y-4">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger border border-status-danger/20 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-semibold text-text-primary">
                  Delete Selected Records
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  Permanently delete {selectedIds.length} selected records.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel onClick={() => setShowBulkDeleteConfirm(false)} className="text-xs h-9 px-4">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} variant="destructive" className="text-xs h-9 px-4">
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Records`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
