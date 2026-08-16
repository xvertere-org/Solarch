import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { solarch } from '@/lib/solarch'
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Database,
  Search,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Collection {
  id: string
  name: string
  type: string
  system: boolean
  listRule: string | null
  viewRule: string | null
  createRule: string | null
  updateRule: string | null
  deleteRule: string | null
  schema: any[]
  indexes?: string[]
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Search and Filter State
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'base' | 'auth' | 'view'>('base')
  const [creating, setCreating] = useState(false)

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCollections = useCallback(async () => {
    try {
      setError(null)
      const res = await solarch.collections.getList(1, 200)
      const items = res.items || []
      setCollections(items as any[])
    } catch (err: any) {
      console.error('Failed to load collections:', err)
      setError(err.message || 'Failed to fetch collections.')
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCollections()
  }

  // Filtered collections
  const filtered = useMemo(() => {
    return collections.filter((col) => {
      const matchesSearch = col.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || col.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [collections, search, typeFilter])

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || creating) return

    try {
      setCreating(true)
      const payload: any = {
        name: newName.trim().toLowerCase(),
        type: newType,
        schema: [],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }

      await solarch.collections.create(payload)
      toast.success(`Collection "${newName}" created successfully`)
      setShowCreateModal(false)
      setNewName('')
      setNewType('base')
      await fetchCollections()
    } catch (err: any) {
      console.error('Create collection failed:', err)
      toast.error(err.message || 'Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    try {
      setDeleting(true)
      await solarch.collections.delete(deleteTarget.id)
      toast.success(`Collection "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await fetchCollections()
    } catch (err: any) {
      console.error('Delete collection failed:', err)
      toast.error(err.message || 'Failed to delete collection')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collections" description="Schema models and persistent data collections." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error && collections.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collections" description="Schema models and persistent data collections." />
        <ErrorState title="Unable to load collections" message={error} onRetry={fetchCollections} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Collections"
        description="Define schemas, manage fields, and configure table access rules."
        action={
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Plus size={13} />
            <span>New Collection</span>
          </Button>
        }
      />

      {/* 2. Collections Card */}
      <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
        {/* Table Filters Bar */}
        <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              All Collections
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
              {filtered.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Filter collections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-36 sm:w-48"
              />
            </div>

            {/* Type Selector */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="view">View</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
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

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Database size={24} />}
              title={search ? 'No matching collections' : 'No collections found'}
              message={
                search
                  ? `No collections match "${search}".`
                  : 'Get started by creating your first schema collection.'
              }
              action={
                !search && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs mt-2"
                  >
                    Create Collection
                  </Button>
                )
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
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Fields</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Scope</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((col) => (
                    <TableRow
                      key={col.id}
                      className="border-b border-border/40 hover:bg-bg-surface-hover/50 transition-colors group"
                    >
                      <TableCell className="py-2.5 font-mono text-xs text-text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Database size={14} className="text-text-muted group-hover:text-brand-primary transition-colors" />
                          <Link
                            to={`/collections/${col.id}`}
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
                      <TableCell className="py-2.5 font-mono text-xs text-text-secondary">
                        {col.schema?.length || 0} fields
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
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/records/${col.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                              title="Browse Records"
                            >
                              <Eye size={13} />
                            </Button>
                          </Link>
                          <Link to={`/collections/${col.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                              title="Edit Schema"
                            >
                              <Edit size={13} />
                            </Button>
                          </Link>
                          {!col.system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(col)}
                              className="h-7 px-2 text-xs text-status-danger hover:text-status-danger hover:bg-status-danger/10 cursor-pointer"
                              title="Delete Collection"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. New Collection Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="p-6 space-y-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle>New Collection</DialogTitle>
            <DialogDescription>
              Create a new table schema to persist and query records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="col-name" className="text-xs font-medium text-text-secondary">
                Collection Name
              </Label>
              <Input
                id="col-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. articles, products, comments"
                required
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-text-muted">
                Lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="col-type" className="text-xs font-medium text-text-secondary">
                Collection Type
              </Label>
              <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                <SelectTrigger id="col-type" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Collection (Standard record storage)</SelectItem>
                  <SelectItem value="auth">Auth Collection (User authentication & profiles)</SelectItem>
                  <SelectItem value="view">View Collection (Read-only SQL view)</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Button
                type="submit"
                variant="default"
                disabled={creating || !newName.trim()}
                className="text-xs h-9"
              >
                {creating ? 'Creating...' : 'Create Collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent className="p-6 space-y-4">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger border border-status-danger/20 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-semibold text-text-primary">
                  Delete Collection
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  Permanently delete collection and all associated records.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs space-y-1">
            <p className="font-semibold">Destructive Action</p>
            <p className="text-status-danger/90">
              Collection <span className="font-mono font-bold">"{deleteTarget?.name}"</span> and all its records will be dropped from the database.
            </p>
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive"
              className="text-xs h-9 px-4"
            >
              {deleting ? 'Deleting...' : 'Delete Collection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
