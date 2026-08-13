import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Trash2, RefreshCw, Archive } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

export default function Backups() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadBackups() }, [])

  async function loadBackups() {
    try {
      const data = await api.get('/api/backups')
      setBackups(Array.isArray(data) ? data : [])
    } catch (err: any) { console.error('Failed to load backups', err) }
    finally { setLoading(false) }
  }

  async function createBackup() {
    setCreating(true)
    try {
      const name = `backup_${Date.now()}.zip`
      await api.post('/api/backups', { name })
      toast.success('Backup archive created successfully')
      loadBackups()
    } catch (err: any) { toast.error(err.message || 'Failed to create backup') }
    finally { setCreating(false) }
  }

  async function confirmDeleteBackup() {
    if (!deleteTargetKey) return
    setDeleting(true)
    try {
      await api.delete(`/api/backups/${encodeURIComponent(deleteTargetKey)}`)
      toast.success('Backup archive deleted')
      setDeleteTargetKey(null)
      loadBackups()
    } catch (err: any) { toast.error(err.message || 'Failed to delete backup') }
    finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backups"
        description="Generate and manage full ZIP database archive backups."
        actions={
          <Button onClick={createBackup} disabled={creating}>
            {creating ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw size={16} />}
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        }
      />

      {backups.length === 0 ? (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-center p-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              <Archive size={36} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No Backups Found</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Click "Create Backup" to generate your first system backup archive.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archive Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map(b => (
                <TableRow key={b.key}>
                  <TableCell className="font-mono text-xs text-[var(--text-primary)]">
                    {b.key}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">
                    {(b.size / 1024 / 1024).toFixed(2)} MB
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {new Date(b.modified).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTargetKey(b.key)}
                      aria-label={`Delete backup archive ${b.key}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Backup Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTargetKey} onOpenChange={(open) => !open && setDeleteTargetKey(null)}>
        <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Backup</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete backup file "{deleteTargetKey}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBackup}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
