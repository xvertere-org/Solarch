import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { solarch } from '@/lib/solarch'
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

interface Collection {
  id: string
  name: string
  type: string
  schema: any[]
}

export default function RecordDetail() {
  const { collectionId, recordId } = useParams<{ collectionId: string; recordId: string }>()
  const navigate = useNavigate()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [record, setRecord] = useState<any | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  const fetchRecord = useCallback(async () => {
    if (!collectionId || !recordId) return
    try {
      setError(null)
      const colData: any = await solarch.collections.getOne(collectionId)
      setCollection(colData)

      const recData: any = await solarch.collection(collectionId).getOne(recordId)
      setRecord(recData)
      setFormData({ ...recData })
    } catch (err: any) {
      console.error('Failed to load record:', err)
      setError(err.message || 'Record not found or access denied.')
    } finally {
      setLoading(false)
    }
  }, [collectionId, recordId])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  const handleCopyId = () => {
    if (!recordId) return
    navigator.clipboard.writeText(recordId)
    setCopiedId(true)
    toast.success('Record ID copied')
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectionId || !recordId || saving) return

    try {
      setSaving(true)
      // Exclude system fields
      const { id, created, updated, ...payload } = formData
      await solarch.collection(collectionId).update(recordId, payload)
      toast.success('Record updated successfully')
      await fetchRecord()
    } catch (err: any) {
      console.error('Update record error:', err)
      toast.error(err.message || 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!collectionId || !recordId || deleting) return

    try {
      setDeleting(true)
      await solarch.collection(collectionId).delete(recordId)
      toast.success('Record deleted')
      navigate(`/records/${collectionId}`)
    } catch (err: any) {
      console.error('Delete record error:', err)
      toast.error(err.message || 'Failed to delete record')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Record Details" description="Inspect and modify record attributes." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="space-y-6">
        <PageHeader title="Record Details" description="Inspect and modify record attributes." />
        <ErrorState
          title="Record not found"
          message={error || 'Unable to locate the requested record.'}
          onRetry={fetchRecord}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Actions */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to={`/records/${collectionId}`}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <span>Record Details</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-brand-primary/40 transition-colors ml-1 cursor-pointer"
              title="Click to copy Record ID"
            >
              <span>{recordId}</span>
              {copiedId ? <Check size={11} className="text-status-success" /> : <Copy size={11} />}
            </button>
          </div>
        }
        description={`Collection: ${collection?.name || collectionId}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-status-danger hover:bg-status-danger/10 border-border/60 h-8 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        }
      />

      {/* 2. Record Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Fields Form (2 cols) */}
        <Card className="lg:col-span-2 border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              Fields & Values
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Edit the attribute values stored in this record.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              {collection?.schema?.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-secondary">
                    {field.name} {field.required && <span className="text-status-danger">*</span>}
                  </Label>

                  {field.type === 'bool' ? (
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <Checkbox
                        checked={!!formData[field.name]}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, [field.name]: !!checked })
                        }
                      />
                      <span>True / Enabled</span>
                    </label>
                  ) : field.type === 'json' ? (
                    <Textarea
                      value={
                        typeof formData[field.name] === 'object'
                          ? JSON.stringify(formData[field.name], null, 2)
                          : formData[field.name] || ''
                      }
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value)
                          setFormData({ ...formData, [field.name]: parsed })
                        } catch {
                          setFormData({ ...formData, [field.name]: e.target.value })
                        }
                      }}
                      className="font-mono text-xs h-28"
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'}
                      required={field.required}
                      value={formData[field.name] ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                      className="h-8 text-xs font-sans"
                    />
                  )}
                </div>
              ))}
            </form>
          </CardContent>
        </Card>

        {/* Record Metadata Card (1 col) */}
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none h-fit">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              Metadata
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              System managed timestamps
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="p-2.5 rounded-lg border border-border/50 bg-bg-surface space-y-1">
              <span className="text-[11px] text-text-muted">Record ID</span>
              <div className="font-mono text-xs text-text-primary">{record.id}</div>
            </div>
            <div className="p-2.5 rounded-lg border border-border/50 bg-bg-surface space-y-1">
              <span className="text-[11px] text-text-muted">Created</span>
              <div className="font-mono text-xs text-text-primary">
                {record.created ? new Date(record.created).toLocaleString() : '—'}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-border/50 bg-bg-surface space-y-1">
              <span className="text-[11px] text-text-muted">Last Updated</span>
              <div className="font-mono text-xs text-text-primary">
                {record.updated ? new Date(record.updated).toLocaleString() : '—'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
                  Are you sure you want to permanently delete this record?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} className="text-xs h-9 px-4">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive" className="text-xs h-9 px-4">
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
