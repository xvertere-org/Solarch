import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { solarch } from '../lib/solarch'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

interface Field { id: string; name: string; type: string; required: boolean }

const fieldTypes = ['text','number','bool','email','url','date','select','file','relation','json','editor','geoPoint','autodate','vector']

export default function CollectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCollection() }, [id])

  async function loadCollection() {
    if (!id) return
    try { setCollection(await solarch.collections.getOne(id)) }
    catch (err: any) { console.error('Failed to load collection', err) }
    finally { setLoading(false) }
  }

  async function saveCollection(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (!id) return
    try {
      await solarch.collections.update(id, collection)
      toast.success('Collection schema saved successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save collection')
    } finally {
      setSaving(false)
    }
  }

  function addField() {
    setCollection({ ...collection, fields: [...(collection.fields || []), { id: `fld_${Date.now()}`, name: '', type: 'text', required: false, system: false }] })
  }

  function updateField(index: number, updates: Partial<Field>) {
    const fields = [...collection.fields]; fields[index] = { ...fields[index], ...updates }
    setCollection({ ...collection, fields })
  }

  function removeField(index: number) {
    setCollection({ ...collection, fields: collection.fields.filter((_: any, i: number) => i !== index) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="text-center p-12 text-[var(--text-secondary)] space-y-4">
        <p>Collection not found</p>
        <Button variant="outline" onClick={() => navigate('/collections')}>
          <ArrowLeft size={16} /> Back to Collections
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/collections')}>
          <ArrowLeft size={16} /> Back to Collections
        </Button>
      </div>

      <PageHeader
        title={`Edit Schema: ${collection.name}`}
        description={`Configure database fields and access rules for the "${collection.name}" collection.`}
      />

      <form onSubmit={saveCollection} className="space-y-6">
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coll-name">Collection Name</Label>
              <Input
                id="coll-name"
                value={collection.name}
                onChange={e => setCollection({ ...collection, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coll-type">Type</Label>
              <Select value={collection.type} onValueChange={(val) => val && setCollection({ ...collection, type: val })}>
                <SelectTrigger id="coll-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Schema Fields</CardTitle>
            <Button type="button" size="sm" onClick={addField}>
              <Plus size={14} /> Add Field
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {collection.fields?.map((field: Field, index: number) => (
              <div key={field.id} className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--bg-border)]">
                <div className="flex-2 space-y-1">
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    value={field.name}
                    onChange={e => updateField(index, { name: e.target.value })}
                    placeholder="e.g. title, price"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={field.type} onValueChange={(val) => val && updateField(index, { type: val })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
                      {fieldTypes.map(t => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox
                    id={`req-${index}`}
                    checked={field.required}
                    onCheckedChange={(val) => updateField(index, { required: !!val })}
                  />
                  <Label htmlFor={`req-${index}`} className="cursor-pointer text-xs">Required</Label>
                </div>
                <div className="pt-5">
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeField(index)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {(!collection.fields || collection.fields.length === 0) && (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">
                No fields yet. Click "Add Field" to create one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">API Authorization Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'].map(rule => (
              <div key={rule} className="space-y-1">
                <Label htmlFor={rule} className="text-xs font-mono">{rule}</Label>
                <Input
                  id={rule}
                  value={collection[rule] || ''}
                  onChange={e => setCollection({ ...collection, [rule]: e.target.value || null })}
                  placeholder="@request.auth.id != ''"
                />
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
                <Save size={16} /> Save Collection
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
