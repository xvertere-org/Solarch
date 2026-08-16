import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { solarch } from '@/lib/solarch'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Layers,
  Eye,
  KeyRound,
  Shield,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'

interface Field {
  id: string
  name: string
  type: string
  required: boolean
  system?: boolean
  options?: Record<string, any>
}

interface Collection {
  id: string
  name: string
  type: string
  system?: boolean
  schema: Field[]
  listRule: string | null
  viewRule: string | null
  createRule: string | null
  updateRule: string | null
  deleteRule: string | null
  indexes?: string[]
}

const FIELD_TYPES = [
  { value: 'text', label: 'Plain Text' },
  { value: 'number', label: 'Number' },
  { value: 'bool', label: 'Boolean (True/False)' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL / Link' },
  { value: 'date', label: 'Date & Time' },
  { value: 'select', label: 'Single/Multi Select' },
  { value: 'json', label: 'JSON Data' },
  { value: 'file', label: 'File Upload' },
  { value: 'relation', label: 'Relation to Collection' },
]

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [name, setName] = useState('')
  const [listRule, setListRule] = useState<string | null>(null)
  const [viewRule, setViewRule] = useState<string | null>(null)
  const [createRule, setCreateRule] = useState<string | null>(null)
  const [updateRule, setUpdateRule] = useState<string | null>(null)
  const [deleteRule, setDeleteRule] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fields' | 'rules'>('fields')

  const fetchCollection = useCallback(async () => {
    if (!id) return
    try {
      setError(null)
      const data: any = await solarch.collections.getOne(id)
      setCollection(data)
      setName(data.name || '')
      setFields(Array.isArray(data.schema) ? data.schema : [])
      setListRule(data.listRule ?? '')
      setViewRule(data.viewRule ?? '')
      setCreateRule(data.createRule ?? '')
      setUpdateRule(data.updateRule ?? '')
      setDeleteRule(data.deleteRule ?? '')
    } catch (err: any) {
      console.error('Failed to fetch collection:', err)
      setError(err.message || 'Failed to load collection schema.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  const handleAddField = () => {
    const newField: Field = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      type: 'text',
      required: false,
      system: false,
    }
    setFields([...fields, newField])
  }

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId))
  }

  const handleUpdateField = (fieldId: string, updates: Partial<Field>) => {
    setFields(
      fields.map((f) => {
        if (f.id === fieldId) {
          return { ...f, ...updates }
        }
        return f
      })
    )
  }

  const handleSave = async () => {
    if (!id || saving) return

    // Validation
    const emptyFieldName = fields.find((f) => !f.name.trim())
    if (emptyFieldName) {
      toast.error('All schema fields must have a valid name.')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: name.trim().toLowerCase(),
        schema: fields.map((f) => ({
          ...f,
          name: f.name.trim().toLowerCase(),
        })),
        listRule: listRule?.trim() === '' ? null : listRule,
        viewRule: viewRule?.trim() === '' ? null : viewRule,
        createRule: createRule?.trim() === '' ? null : createRule,
        updateRule: updateRule?.trim() === '' ? null : updateRule,
        deleteRule: deleteRule?.trim() === '' ? null : deleteRule,
      }

      await solarch.collections.update(id, payload)
      toast.success('Collection schema saved successfully')
      await fetchCollection()
    } catch (err: any) {
      console.error('Save collection error:', err)
      toast.error(err.message || 'Failed to save collection schema')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collection Schema" description="Configure table columns and rules." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collection Schema" description="Configure table columns and rules." />
        <ErrorState
          title="Collection not found"
          message={error || 'Unable to locate requested schema collection.'}
          onRetry={fetchCollection}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Top Header with Back Navigation & Save Action */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to="/collections"
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <span>{collection.name}</span>
            <Badge
              variant={collection.type === 'auth' ? 'accent' : 'secondary'}
              className="text-[10px] uppercase font-mono px-2 py-0.5 ml-1"
            >
              {collection.type}
            </Badge>
          </div>
        }
        description={`Collection ID: ${collection.id}`}
        action={
          <div className="flex items-center gap-2">
            <Link to={`/records/${collection.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
              >
                <Eye size={13} />
                <span>Browse Records</span>
              </Button>
            </Link>
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

      {/* 2. Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('fields')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'fields'
              ? 'bg-brand-primary text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          Schema Fields ({fields.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-brand-primary text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          API Access Rules
        </button>
      </div>

      {/* 3. Fields Tab Content */}
      {activeTab === 'fields' && (
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold font-display text-text-primary">
                Schema Definition
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Define the properties and data types for records in this collection.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddField}
              className="h-7 text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add Field
            </Button>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* System Default Fields */}
            <div className="p-3 rounded-lg border border-border/50 bg-bg-surface space-y-2">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                System Managed Columns
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-bg-elevated text-xs font-mono text-text-secondary flex items-center gap-1.5">
                  <KeyRound size={12} className="text-brand-primary" /> id (Primary Key)
                </div>
                <div className="p-2 rounded bg-bg-elevated text-xs font-mono text-text-secondary">
                  created (Timestamp)
                </div>
                <div className="p-2 rounded bg-bg-elevated text-xs font-mono text-text-secondary">
                  updated (Timestamp)
                </div>
              </div>
            </div>

            {/* Custom User Fields */}
            {fields.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No custom fields defined"
                message="Click Add Field to define custom table attributes for this collection."
                action={
                  <Button size="sm" variant="default" onClick={handleAddField} className="text-xs mt-2">
                    Add Field
                  </Button>
                }
                className="py-8"
              />
            ) : (
              fields.map((field) => (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border border-border/60 bg-bg-surface hover:border-border transition-colors group"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      value={field.name}
                      onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                      placeholder="field_name"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <Select
                      value={field.type}
                      onValueChange={(val) => handleUpdateField(field.id, { type: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => handleUpdateField(field.id, { required: !!checked })}
                      />
                      <span>Required</span>
                    </label>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(field.id)}
                    className="h-8 w-8 p-0 text-status-danger hover:bg-status-danger/10 cursor-pointer"
                    title="Remove field"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. API Rules Tab Content */}
      {activeTab === 'rules' && (
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-brand-primary" />
              <span>API Rule Filters</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Leave blank to grant public access. Set to null (empty) or write filter expressions.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {[
              { key: 'list', label: 'List / Search Rule', value: listRule, setter: setListRule },
              { key: 'view', label: 'View / Detail Rule', value: viewRule, setter: setViewRule },
              { key: 'create', label: 'Create Rule', value: createRule, setter: setCreateRule },
              { key: 'update', label: 'Update Rule', value: updateRule, setter: setUpdateRule },
              { key: 'delete', label: 'Delete Rule', value: deleteRule, setter: setDeleteRule },
            ].map((rule) => (
              <div key={rule.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-text-secondary">{rule.label}</Label>
                  <span className="text-[11px] text-text-muted font-mono">
                    {rule.value === '' || rule.value === null ? 'Public (No restrictions)' : 'Restricted'}
                  </span>
                </div>
                <Input
                  value={rule.value || ''}
                  onChange={(e) => rule.setter(e.target.value)}
                  placeholder='e.g. @request.auth.id != "" && user = @request.auth.id'
                  className="h-8 text-xs font-mono"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
