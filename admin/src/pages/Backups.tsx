import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { solarch } from '@/lib/solarch'
import { adminApi, BackupItem } from '@/lib/admin-api'
import {
  Trash2,
  RefreshCw,
  Upload,
  Plus,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Archive,
  HardDrive,
  Clock,
  FileArchive,
  AlertTriangle,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { StatCard } from '@/components/domain/StatCard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Backups() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customBackupName, setCustomBackupName] = useState('')
  const [creating, setCreating] = useState(false)

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Restore State
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Table filter & pagination
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const fetchBackups = useCallback(async () => {
    try {
      setError(null)
      const data = await adminApi.backups.getList()
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
        const timeA = new Date(a.modified || a.created || 0).getTime()
        const timeB = new Date(b.modified || b.created || 0).getTime()
        return timeB - timeA
      })
      setBackups(sorted)
    } catch (err: any) {
      console.error('Failed to fetch backups:', err)
      setError(err.message || 'Failed to load backup archives.')
      toast.error('Failed to load backup archives')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCount = backups.length
    const totalBytes = backups.reduce((acc, curr) => acc + (curr.size || 0), 0)
    const latestTimestamp = backups.length > 0 ? (backups[0].modified || backups[0].created) : null
    return { totalCount, totalBytes, latestTimestamp }
  }, [backups])

  // Filtered & Paginated Backups
  const filteredBackups = useMemo(() => {
    if (!search.trim()) return backups
    const q = search.toLowerCase()
    return backups.filter((b) => (b.key || b.name || '').toLowerCase().includes(q))
  }, [backups, search])

  const totalPages = Math.max(1, Math.ceil(filteredBackups.length / perPage))
  const paginatedBackups = useMemo(() => {
    const start = (page - 1) * perPage
    return filteredBackups.slice(start, start + perPage)
  }, [filteredBackups, page, perPage])

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (val?: string | number) => {
    if (!val) return '—'
    const d = new Date(val)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Handlers
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return

    try {
      setCreating(true)
      const res = await adminApi.backups.create(customBackupName.trim() || undefined)
      toast.success(res?.message || 'Backup created successfully')
      setShowCreateModal(false)
      setCustomBackupName('')
      await fetchBackups()
    } catch (err: any) {
      console.error('Create backup failed:', err)
      toast.error(err.message || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleUploadBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || uploading) return

    try {
      setUploading(true)
      await adminApi.backups.upload(uploadFile)
      toast.success('Backup uploaded successfully')
      setShowUploadModal(false)
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchBackups()
    } catch (err: any) {
      console.error('Upload backup failed:', err)
      toast.error(err.message || 'Failed to upload backup archive')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadBackup = (backup: BackupItem) => {
    try {
      const downloadUrl = solarch.http.buildUrl(`/api/backups/${encodeURIComponent(backup.key)}`, {
        token: solarch.authStore.getToken(),
      })
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = backup.key
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Backup download started')
    } catch (err: any) {
      toast.error(err.message || 'Failed to download backup')
    }
  }

  const handleConfirmRestore = async () => {
    if (!restoreTarget || restoring) return

    try {
      setRestoring(true)
      await adminApi.backups.restore(restoreTarget.key)
      toast.success('Backup restored successfully. Reloading...')
      setRestoreTarget(null)
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (err: any) {
      console.error('Restore failed:', err)
      toast.error(err.message || 'Failed to restore backup')
    } finally {
      setRestoring(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return

    try {
      setDeleting(true)
      await adminApi.backups.delete(deleteTarget.key)
      toast.success('Backup deleted successfully')
      setDeleteTarget(null)
      await fetchBackups()
    } catch (err: any) {
      console.error('Delete backup failed:', err)
      toast.error(err.message || 'Failed to delete backup')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Backups" description="Manage database snapshots, archives, and restore points." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error && backups.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Backups" description="Manage database snapshots, archives, and restore points." />
        <ErrorState title="Unable to load backups" message={error} onRetry={fetchBackups} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Actions */}
      <PageHeader
        title="Backups"
        description="Create snapshots, restore points, and export database archives."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary h-8 cursor-pointer"
            >
              <Upload size={13} />
              <span>Upload</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
            >
              <Plus size={13} />
              <span>New Backup</span>
            </Button>
          </div>
        }
      />

      {/* 2. Stat Cards */}
      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Backups"
          value={stats.totalCount}
          icon={<Archive size={18} />}
        />
        <StatCard
          title="Total Storage Used"
          value={formatBytes(stats.totalBytes)}
          icon={<HardDrive size={18} />}
        />
        <StatCard
          title="Latest Snapshot"
          value={stats.latestTimestamp ? formatDate(stats.latestTimestamp) : 'None'}
          icon={<Clock size={18} />}
        />
      </div>

      {/* 3. Table Card */}
      <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
        <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              Backup Archives
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
              {filteredBackups.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search backups..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-8 text-xs w-44 sm:w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBackups}
              className="h-8 w-8 p-0 text-text-muted hover:text-text-primary cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredBackups.length === 0 ? (
            <EmptyState
              icon={Archive}
              title={search ? 'No matching backups' : 'No backups found'}
              message={
                search
                  ? `No backup files match "${search}".`
                  : 'Create your first snapshot or upload an existing backup archive.'
              }
              action={
                !search && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs mt-2"
                  >
                    Create Snapshot
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
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Archive Name</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">File Size</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary">Created / Modified</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold text-text-secondary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBackups.map((b) => (
                    <TableRow
                      key={b.key}
                      className="border-b border-border/40 hover:bg-bg-surface-hover/50 transition-colors group"
                    >
                      <TableCell className="py-2.5 font-mono text-xs text-text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <FileArchive size={14} className="text-text-muted group-hover:text-brand-primary transition-colors" />
                          <span className="truncate max-w-[260px] sm:max-w-md">{b.key}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-text-secondary">
                        {formatBytes(b.size)}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-text-muted">
                        {formatDate(b.modified || b.created)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadBackup(b)}
                            className="h-7 px-2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                            title="Download"
                          >
                            <Download size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreTarget(b)}
                            className="h-7 px-2 text-xs text-status-warning hover:text-status-warning hover:bg-status-warning/10 cursor-pointer"
                            title="Restore"
                          >
                            <RotateCcw size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(b)}
                            className="h-7 px-2 text-xs text-status-danger hover:text-status-danger hover:bg-status-danger/10 cursor-pointer"
                            title="Delete"
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
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/50 bg-bg-surface flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Page {page} of {totalPages} ({filteredBackups.length} total)
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

      {/* 4. Create Backup Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="p-6 space-y-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle>Create Backup Snapshot</DialogTitle>
            <DialogDescription>
              Create a full point-in-time snapshot of the database and files.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBackup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="backup-name" className="text-xs font-medium text-text-secondary">
                Archive Name (Optional)
              </Label>
              <Input
                id="backup-name"
                value={customBackupName}
                onChange={(e) => setCustomBackupName(e.target.value)}
                placeholder="e.g. pre-migration-backup"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-text-muted">
                If left blank, an automatic timestamped name will be assigned.
              </p>
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
                disabled={creating}
                className="text-xs h-9"
              >
                {creating ? 'Creating...' : 'Create Snapshot'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Upload Backup Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="p-6 space-y-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle>Upload Backup Archive</DialogTitle>
            <DialogDescription>
              Upload a previously downloaded .zip backup archive.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadBackup} className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (e.dataTransfer.files?.[0]) setUploadFile(e.dataTransfer.files[0])
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
                isDragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-border/80 bg-bg-surface hover:border-brand-primary/40'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.tar.gz"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setUploadFile(e.target.files[0])
                }}
              />
              <Upload size={24} className="text-text-muted mb-2" />
              <p className="text-xs font-medium text-text-primary">
                {uploadFile ? uploadFile.name : 'Click to select or drag and drop archive'}
              </p>
              <p className="text-[11px] text-text-muted mt-1">Accepts .zip archives</p>
            </div>
            <DialogFooter className="pt-2 border-t border-border gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                }}
                disabled={uploading}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={uploading || !uploadFile}
                className="text-xs h-9"
              >
                {uploading ? 'Uploading...' : 'Upload Archive'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Restore Confirmation AlertDialog */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open: boolean) => !open && !restoring && setRestoreTarget(null)}
      >
        <AlertDialogContent className="p-6 space-y-4">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-warning/10 text-status-warning border border-status-warning/20 shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-semibold text-text-primary">
                  Restore Backup
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  Restore the selected archive to the current Solarch instance.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning flex items-start gap-2.5 text-xs">
            <AlertTriangle size={16} className="text-status-warning shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold text-status-warning">Destructive Operation</p>
              <p className="text-status-warning/90">
                Restoring this backup will replace current records and schema tables. This action cannot be undone.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel
              onClick={() => setRestoreTarget(null)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              variant="destructive"
              className="text-xs h-9 px-4"
            >
              {restoring ? 'Restoring...' : 'Restore Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 7. Delete Confirmation AlertDialog */}
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
                  Delete Backup
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  Permanently remove this backup archive.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              variant="destructive"
              className="text-xs h-9 px-4"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
