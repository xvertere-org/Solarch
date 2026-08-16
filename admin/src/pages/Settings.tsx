import { useEffect, useState, useCallback } from 'react'
import { adminApi, AdminSettings } from '@/lib/admin-api'
import {
  Save,
  Zap,
  Globe,
  Mail,
  Sparkles,
  HardDrive,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingS3, setTestingS3] = useState(false)
  const [testingAI, setTestingAI] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')

  const fetchSettings = useCallback(async () => {
    try {
      setError(null)
      const data = await adminApi.settings.get()
      setSettings(data)
    } catch (err: any) {
      console.error('Fetch settings error:', err)
      setError(err.message || 'Failed to load platform settings.')
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings || saving) return

    try {
      setSaving(true)
      const updated = await adminApi.settings.update(settings)
      setSettings(updated)
      toast.success('Platform settings saved successfully')
    } catch (err: any) {
      console.error('Save settings error:', err)
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testEmailConnection = async () => {
    if (!settings) return
    const target = testEmailAddress.trim() || settings.senderAddress || 'test@example.com'

    try {
      setTestingEmail(true)
      await adminApi.settings.testEmail(target, { smtp: settings.smtp, senderAddress: settings.senderAddress, senderName: settings.senderName })
      toast.success(`Verification email sent to ${target}`)
    } catch (err: any) {
      console.error('Email test error:', err)
      toast.error(err.message || 'SMTP email test failed')
    } finally {
      setTestingEmail(false)
    }
  }

  const testS3Connection = async () => {
    if (!settings) return
    try {
      setTestingS3(true)
      await adminApi.settings.testS3({ s3: settings.s3 })
      toast.success('S3 storage connection verified successfully')
    } catch (err: any) {
      console.error('S3 test error:', err)
      toast.error(err.message || 'S3 connection test failed')
    } finally {
      setTestingS3(false)
    }
  }

  const testAIConnection = async () => {
    if (!settings) return
    try {
      setTestingAI(true)
      const res = await adminApi.ai.test({ ai: settings.ai })
      toast.success(res?.reply || 'AI connection test successful')
    } catch (err: any) {
      console.error('AI test error:', err)
      toast.error(err.message || 'AI provider test failed')
    } finally {
      setTestingAI(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Settings" description="System configuration and integrations." />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Settings" description="System configuration and integrations." />
        <ErrorState title="Unable to load settings" message={error || ''} onRetry={fetchSettings} />
      </div>
    )
  }

  const ai = settings.ai || {
    enabled: false,
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseURL: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 2000,
  }

  const smtp = settings.smtp || {
    host: '',
    port: 587,
    username: '',
    password: '',
    tls: true,
    authMethod: 'PLAIN',
  }

  const s3 = settings.s3 || {
    enabled: false,
    bucket: '',
    region: 'us-east-1',
    endpoint: '',
    accessKey: '',
    secret: '',
    forcePathStyle: false,
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Settings"
        description="Configure application metadata, SMTP mailers, S3 file storage, and AI providers."
        action={
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Save size={13} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. General Application Settings Card */}
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
              <Globe size={16} className="text-brand-primary" />
              <span>Application Metadata</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Public application naming, base URL, and log retention rules
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-medium text-text-secondary">
                  Application Name
                </Label>
                <Input
                  id="appName"
                  value={settings.appName || ''}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  placeholder="Solarch"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appURL" className="text-xs font-medium text-text-secondary">
                  Application Base URL
                </Label>
                <Input
                  id="appURL"
                  value={settings.appURL || ''}
                  onChange={(e) => setSettings({ ...settings, appURL: e.target.value })}
                  placeholder="http://localhost:8090"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="senderName" className="text-xs font-medium text-text-secondary">
                  Sender Name
                </Label>
                <Input
                  id="senderName"
                  value={settings.senderName || ''}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  placeholder="Solarch Support"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderAddress" className="text-xs font-medium text-text-secondary">
                  Sender Email Address
                </Label>
                <Input
                  id="senderAddress"
                  type="email"
                  value={settings.senderAddress || ''}
                  onChange={(e) => setSettings({ ...settings, senderAddress: e.target.value })}
                  placeholder="noreply@example.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. SMTP Mailer Settings Card */}
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
              <Mail size={16} className="text-brand-primary" />
              <span>Mail & SMTP Gateway</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Outgoing email server for password resets and verification tokens
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="smtpHost" className="text-xs font-medium text-text-secondary">
                  SMTP Host
                </Label>
                <Input
                  id="smtpHost"
                  value={smtp.host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...smtp, host: e.target.value } })}
                  placeholder="smtp.example.com"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtpPort" className="text-xs font-medium text-text-secondary">
                  Port
                </Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtp.port || 587}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...smtp, port: Number(e.target.value) } })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtpUser" className="text-xs font-medium text-text-secondary">
                  Username
                </Label>
                <Input
                  id="smtpUser"
                  value={smtp.username || ''}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...smtp, username: e.target.value } })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtpPass" className="text-xs font-medium text-text-secondary">
                  Password
                </Label>
                <Input
                  id="smtpPass"
                  type="password"
                  placeholder="••••••••••••"
                  value={smtp.password || ''}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...smtp, password: e.target.value } })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <Checkbox
                  checked={!!smtp.tls}
                  onCheckedChange={(checked) => setSettings({ ...settings, smtp: { ...smtp, tls: !!checked } })}
                />
                <span>Enable TLS / STARTTLS Encryption</span>
              </label>

              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Test recipient email..."
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="h-8 text-xs w-48"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testEmailConnection}
                  disabled={testingEmail}
                  className="h-8 text-xs cursor-pointer"
                >
                  <Mail size={12} className="mr-1" />
                  <span>{testingEmail ? 'Sending...' : 'Test Email'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. S3 Storage Settings Card */}
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
              <HardDrive size={16} className="text-brand-primary" />
              <span>S3 Object Storage</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Offload uploaded media assets and files to AWS S3, MinIO, or Cloudflare R2
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-bg-surface">
              <div>
                <Label className="text-xs font-semibold text-text-primary block">Enable S3 Storage</Label>
                <p className="text-[11px] text-text-muted mt-0.5">Store file uploads in an S3 compatible bucket</p>
              </div>
              <Switch
                checked={s3.enabled}
                onCheckedChange={(val) => setSettings({ ...settings, s3: { ...s3, enabled: val } })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Bucket Name</Label>
                <Input
                  value={s3.bucket || ''}
                  onChange={(e) => setSettings({ ...settings, s3: { ...s3, bucket: e.target.value } })}
                  placeholder="my-solarch-bucket"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Region</Label>
                <Input
                  value={s3.region || 'us-east-1'}
                  onChange={(e) => setSettings({ ...settings, s3: { ...s3, region: e.target.value } })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Endpoint URL (Optional for MinIO/R2)</Label>
                <Input
                  value={s3.endpoint || ''}
                  onChange={(e) => setSettings({ ...settings, s3: { ...s3, endpoint: e.target.value } })}
                  placeholder="https://s3.amazonaws.com"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Access Key</Label>
                <Input
                  value={s3.accessKey || ''}
                  onChange={(e) => setSettings({ ...settings, s3: { ...s3, accessKey: e.target.value } })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">Secret Key</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={s3.secret || ''}
                onChange={(e) => setSettings({ ...settings, s3: { ...s3, secret: e.target.value } })}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testS3Connection}
                disabled={testingS3 || !s3.enabled}
                className="h-8 text-xs cursor-pointer"
              >
                <HardDrive size={12} className="mr-1" />
                <span>{testingS3 ? 'Testing...' : 'Test S3 Connection'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. AI Assistant Settings Card */}
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold font-display text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-brand-bright" />
              <span>AI Assistant & Generation</span>
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              Configure LLM endpoints for schema design and conversational assistance
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-bg-surface">
              <div>
                <Label className="text-xs font-semibold text-text-primary block">Enable AI Assistant</Label>
                <p className="text-[11px] text-text-muted mt-0.5">Activate natural language schema creation</p>
              </div>
              <Switch
                checked={ai.enabled}
                onCheckedChange={(val) => setSettings({ ...settings, ai: { ...ai, enabled: val } })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Provider</Label>
                <Select
                  value={ai.provider}
                  onValueChange={(provider) => {
                    const defaultUrls: Record<string, string> = {
                      openai: 'https://api.openai.com/v1',
                      openrouter: 'https://openrouter.ai/api/v1',
                      anthropic: 'https://api.anthropic.com/v1',
                      ollama: 'http://localhost:11434',
                      custom: ai.baseURL,
                    }
                    setSettings({
                      ...settings,
                      ai: {
                        ...ai,
                        provider,
                        baseURL: defaultUrls[provider] || '',
                      },
                    })
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="custom">Custom (OpenAI Compatible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Model Name</Label>
                <Input
                  value={ai.model || ''}
                  onChange={(e) => setSettings({ ...settings, ai: { ...ai, model: e.target.value } })}
                  placeholder="gpt-4o-mini"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">API Key</Label>
                <Input
                  type="password"
                  value={ai.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, ai: { ...ai, apiKey: e.target.value } })}
                  placeholder="sk-..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Base URL</Label>
                <Input
                  value={ai.baseURL || ''}
                  onChange={(e) => setSettings({ ...settings, ai: { ...ai, baseURL: e.target.value } })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testAIConnection}
                disabled={testingAI || !ai.enabled}
                className="h-8 text-xs cursor-pointer"
              >
                <Zap size={12} className="mr-1 text-brand-bright" />
                <span>{testingAI ? 'Testing...' : 'Test AI Connection'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
