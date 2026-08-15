import { useEffect, useState } from 'react'
import { adminApi, type AdminSettings } from '../lib/admin-api'
import { Save, Zap } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const ai = settings?.ai ?? {
    enabled: false,
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    baseURL: "",
    temperature: 0.2,
    maxTokens: 4096,
  }

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    try {
      const data = await adminApi.settings.get()
      setSettings(data || {})
    } catch (err: any) { console.error('Failed to load settings', err) }
    finally { setLoading(false) }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.settings.update(settings)
      toast.success('Settings saved successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function testAIConnection() {
    setTesting(true)
    try {
      const result = await adminApi.ai.test()
      toast.success(`AI Connection Successful: ${result.reply || 'OK'}`)
    } catch (err: any) {
      toast.error(`AI Connection Failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
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
        title="Settings"
        description="Configure application metadata, SMTP mailer, and AI features."
      />

      <form onSubmit={saveSettings} className="space-y-6">
        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Site Name</Label>
              <Input
                id="appName"
                value={settings?.meta?.appName || ''}
                onChange={e => setSettings({ ...settings, meta: { ...settings.meta, appName: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appUrl">Site URL</Label>
              <Input
                id="appUrl"
                value={settings?.meta?.appUrl || ''}
                onChange={e => setSettings({ ...settings, meta: { ...settings.meta, appUrl: e.target.value } })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">SMTP Mailer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">Host</Label>
              <Input
                id="smtpHost"
                value={settings?.smtp?.host || ''}
                onChange={e => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">Port</Label>
              <Input
                id="smtpPort"
                type="number"
                value={settings?.smtp?.port || ''}
                onChange={e => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) || 0 } })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border-[var(--bg-border)]">
          <CardHeader>
            <CardTitle className="font-display text-lg">AI Integration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="aiEnabled"
                checked={ai.enabled}
                onCheckedChange={(val) =>
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      enabled: !!val,
                    },
                  })
                }
              />
              <Label htmlFor="aiEnabled" className="cursor-pointer text-sm font-medium">
                Enable AI Assistant Features
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiProvider">Provider</Label>
              <Select
                value={ai.provider}
                onValueChange={(provider) => {
                  if (!provider) return
                  const urls: Record<string, string> = {
                    openai: "https://api.openai.com/v1",
                    openrouter: "https://openrouter.ai/api/v1",
                    anthropic: "https://api.anthropic.com/v1",
                    ollama: "http://localhost:11434",
                    custom: ai.baseURL,
                  }
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      provider,
                      baseURL: urls[provider] ?? "",
                    },
                  })
                }}
              >
                <SelectTrigger id="aiProvider">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                  <SelectItem value="custom">Custom (OpenAI Compatible)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={ai.apiKey}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      apiKey: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiModel">Model</Label>
              <Input
                id="aiModel"
                value={ai.model}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      model: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input
                id="baseURL"
                placeholder="Auto-filled based on provider"
                value={ai.baseURL}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      baseURL: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={ai.temperature}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: {
                        ...ai,
                        temperature: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={ai.maxTokens}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: {
                        ...ai,
                        maxTokens: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={testAIConnection} disabled={testing}>
                {testing ? <Spinner className="w-4 h-4 mr-2" /> : <Zap size={14} className="mr-2 text-[var(--cyan-spark)]" />}
                {testing ? 'Testing...' : 'Test AI Connection'}
              </Button>
            </div>
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
                <Save size={16} /> Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
