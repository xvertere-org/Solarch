import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { Plus, Search, ChevronLeft, ChevronRight, ArrowLeft, Trash2, Edit } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

export default function Records() {
  const { collectionId } = useParams()
  const [collection, setCollection] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newRecord, setNewRecord] = useState<Record<string, any>>({})
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadCollection() }, [collectionId])
  useEffect(() => { loadRecords() }, [collectionId, page, filter])

  async function loadCollection() {
    try { setCollection(await api.get(`/api/collections/${collectionId}`)) }
    catch (err: any) { console.error('Failed to load collection', err) }
  }

  async function loadRecords() {
    setLoading(true)
    try {
      let url = `/api/collections/${collectionId}/records?page=${page}&perPage=${perPage}`
      if (filter) url += `&filter=${encodeURIComponent(filter)}`
      const data = await api.get(url)
      setRecords(data.items || []); setTotalItems(data.totalItems || 0)
    } catch (err: any) { console.error('Failed to load records', err) }
    finally { setLoading(false) }
  }

  async function createRecord(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/api/collections/${collectionId}/records`, newRecord)
      toast.success('Record created successfully')
      setShowModal(false); setNewRecord({})
      setPage(1); loadRecords()
    } catch (err: any) { toast.error(err.message || 'Failed to create record') }
  }

  async function confirmDeleteRecord() {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      await api.delete(`/api/collections/${collectionId}/records/${deleteTargetId}`)
      toast.success('Record deleted')
      setDeleteTargetId(null)
      loadRecords()
    } catch (err: any) { toast.error(err.message || 'Failed to delete record') }
    finally { setDeleting(false) }
  }

  const totalPages = Math.ceil(totalItems / perPage)
  const displayFields = collection?.fields?.filter((f: any) => !f.system && f.type !== 'json' && f.type !== 'editor') || []

  const getFieldValue = (rec: any, field: any) => {
    const val = rec[field.name]
    if (val === null || val === undefined) return <span className="text-[var(--text-muted)]">—</span>
    if (field.type === 'bool') return val ? 'Yes' : 'No'
    if (field.type === 'date') return new Date(val).toLocaleString()
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 40) + '...'
    return String(val).slice(0, 60)
  }

  if (!collection && loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Back
        </Button>
      </div>

      <PageHeader
        title={`Records: ${collection?.name || '...'}`}
        description={`Browse, filter, and modify rows in the "${collection?.name}" collection.`}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Record
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
        <Input
          placeholder={`Search ${collection?.name || ''} records...`}
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
        </div>
      ) : records.length === 0 ? (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-center p-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              {filter ? 'No records match your filter.' : 'No records yet in this collection.'}
            </p>
            {!filter && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} /> Create Record
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">ID</TableHead>
                {displayFields.map((f: any) => <TableHead key={f.id}>{f.name}</TableHead>)}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono text-xs text-[var(--text-muted)]">
                    {rec.id?.slice(0, 8)}...
                  </TableCell>
                  {displayFields.map((f: any) => (
                    <TableCell key={f.id}>{getFieldValue(rec, f)}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/records/${collectionId}/${rec.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit size={14} /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTargetId(rec.id)}
                        aria-label={`Delete record ${rec.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[var(--bg-border)]">
              <span className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} ({totalItems} total items)
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
      )}

      {/* Create Record Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">New Record — {collection?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createRecord} className="space-y-4 pt-2">
            {collection?.fields?.filter((f: any) => !f.system).map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`fld-${field.id}`}>{field.name}</Label>
                <Input
                  id={`fld-${field.id}`}
                  value={newRecord[field.name] || ''}
                  onChange={e => setNewRecord({ ...newRecord, [field.name]: e.target.value })}
                  placeholder={`Enter ${field.name}`}
                />
              </div>
            ))}
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Record</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRecord}
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
