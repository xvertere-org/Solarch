import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    try { setSettings(await api.get('/api/settings')) }
    catch (err: any) { console.error('Failed to load settings', err) }
    finally { setLoading(false) }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await api.patch('/api/settings', settings); alert('Settings saved') }
    catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }
  async function testAIConnection() {
  try {
    const result = await api.post('/api/ai/test', {})

    alert(`✅ Connection successful!\n\n${result.reply}`)
  } catch (err: any) {
    alert(`❌ Connection failed\n\n${err.message}`)
  }
}

  if (loading) return <div className="empty-state"><div className="spinner" /></div>

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Settings</h2>
      <form onSubmit={saveSettings}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>General</h3>
          <div className="form-group">
            <label>Site Name</label>
            <input value={settings?.meta?.appName || ''} onChange={e => setSettings({ ...settings, meta: { ...settings.meta, appName: e.target.value } })} />
          </div>
          <div className="form-group">
            <label>Site URL</label>
            <input value={settings?.meta?.appUrl || ''} onChange={e => setSettings({ ...settings, meta: { ...settings.meta, appUrl: e.target.value } })} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>SMTP</h3>
          <div className="form-group">
            <label>Host</label>
            <input value={settings?.smtp?.host || ''} onChange={e => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })} />
          </div>
          <div className="form-group">
            <label>Port</label>
            <input type="number" value={settings?.smtp?.port || ''} onChange={e => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) } })} />
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>AI Settings</h3>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={ai.enabled}
                onChange={(e) => 
                  setSettings({
                    ...settings,
                    ai: {
                      ...ai,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              {" "}Enable AI
            </label>
          </div>
          <div className="form-group">
            <label>Provider</label>

            <select
              value={ai.provider}
              onChange={(e) => {
                const provider = e.target.value

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
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
              <option value="custom">Custom (OpenAI Compatible)</option>
            </select>
          </div>
          <div className="form-group">
            <label>API Key</label>

            <input
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
          <div className="form-group">
            <label>Model</label>

            <input
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
          <div className="form-group">
            <label>Base URL</label>

            <input
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
          <div className="form-group">
            <label>Temperature</label>

            <input
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
          <div className="form-group">
            <label>Max Tokens</label>

            <input
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
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn"
              onClick={testAIConnection}
            >
              Test Connection
            </button>
          </div>

        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" /> Saving...</> : 'Save Settings'}
        </button>
      </form>
    </div>

  )
}
