import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { solarch } from '../lib/solarch'
import type { CollectionModel, RecordModel } from '@solarch/core-client'
import { ArrowLeft, Save } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

export default function RecordDetail() {
  const { collectionId, recordId } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<CollectionModel | null>(null)
  const [record, setRecord] = useState<RecordModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [collectionId, recordId])

  async function loadData() {
    if (!collectionId || !recordId) return
    try {
      const [col, rec] = await Promise.all([
        solarch.collections.getOne(collectionId),
        solarch.collection(collectionId).getOne(recordId),
      ])
      setCollection(col); setRecord(rec)
    } catch (err: any) { console.error('Failed to load record', err) }
    finally { setLoading(false) }
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (!collectionId || !recordId || !record) return
    try {
      await solarch.collection(collectionId).update(recordId, record)
      toast.success('Record updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="text-center p-12 text-[var(--text-secondary)] space-y-4">
        <p>Record not found</p>
        <Button variant="outline" onClick={() => navigate(`/records/${collectionId}`)}>
          <ArrowLeft size={16} /> Back to Records
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/records/${collectionId}`)}>
          <ArrowLeft size={16} /> Back to Records
        </Button>
      </div>

      <PageHeader
        title={`Edit Record — ${collection?.name}`}
        description={`Modify record ID: ${recordId}`}
      />

      <form onSubmit={saveRecord} className="space-y-6">
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">Record Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {collection?.fields?.filter((f: any) => !f.system).map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`fld-${field.id}`}>{field.name}</Label>
                {field.type === 'bool' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`fld-${field.id}`}
                      checked={!!record[field.name]}
                      onCheckedChange={(val) => setRecord({ ...record, [field.name]: !!val })}
                    />
                    <Label htmlFor={`fld-${field.id}`} className="cursor-pointer text-sm">
                      {record[field.name] ? 'True / Yes' : 'False / No'}
                    </Label>
                  </div>
                ) : field.type === 'json' || field.type === 'editor' ? (
                  <Textarea
                    id={`fld-${field.id}`}
                    rows={5}
                    className="font-mono text-xs"
                    value={typeof record[field.name] === 'object' ? JSON.stringify(record[field.name], null, 2) : (record[field.name] || '')}
                    onChange={e => {
                      try { setRecord({ ...record, [field.name]: JSON.parse(e.target.value) }) }
                      catch { setRecord({ ...record, [field.name]: e.target.value }) }
                    }}
                  />
                ) : (
                  <Input
                    id={`fld-${field.id}`}
                    value={record[field.name] || ''}
                    onChange={e => setRecord({ ...record, [field.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-6">
            {saving ? (
              <>
                <Spinner className="w-4 h-4 mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
