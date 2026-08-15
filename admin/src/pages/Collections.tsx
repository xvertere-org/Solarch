import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { solarch } from '../lib/solarch'
import type { CollectionModel } from '@solarch/core-client'
import { Plus, Eye, Edit, Trash2, Layers } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

export default function Collections() {
  const [collections, setCollections] = useState<CollectionModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'base' | 'auth' | 'view'>('base')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollectionModel | null>(null)

  useEffect(() => { loadCollections() }, [])

  async function loadCollections() {
    try {
      const data = await solarch.collections.getList()
      setCollections(data.items || [])
    } catch (err: any) { console.error('Failed to load collections', err) }
    finally { setLoading(false) }
  }

  async function createCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await solarch.collections.create({ name: newName.trim(), type: newType, fields: [], indexes: [] })
      toast.success(`Collection "${newName.trim()}" created`)
      setShowModal(false); setNewName(''); loadCollections()
    } catch (err: any) { toast.error(err.message || 'Failed to create collection') }
  }

  async function confirmDeleteCollection() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(id)
    try {
      await solarch.collections.delete(id)
      toast.success(`Collection "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      loadCollections()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete collection')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  const isEmpty = collections.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Manage your database tables, schemas, and fields."
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Collection
          </Button>
        }
      />

      {isEmpty ? (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-center p-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              <Layers size={36} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No Collections Yet</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Create your first collection to start storing data.
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>System</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to={`/collections/${c.id}`} className="hover:underline text-[var(--blue-bright)] font-semibold">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.type === 'auth' ? 'default' : c.type === 'view' ? 'secondary' : 'outline'}>
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">
                    {c.system ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/records/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye size={14} /> Records
                        </Button>
                      </Link>
                      <Link to={`/collections/${c.id}`}>
                        <Button variant="ghost" size="sm" aria-label={`Edit collection ${c.name}`}>
                          <Edit size={14} />
                        </Button>
                      </Link>
                      {!c.system && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(c)}
                          disabled={deleting === c.id}
                          aria-label={`Delete collection ${c.name}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">New Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={createCollection} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. posts, users, products"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={newType} onValueChange={(val) => val && setNewType(val)}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
                  <SelectItem value="base">Base (regular data)</SelectItem>
                  <SelectItem value="auth">Auth (user accounts)</SelectItem>
                  <SelectItem value="view">View (read-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Collection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete collection "{deleteTarget?.name}"? All contained records will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCollection}
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
