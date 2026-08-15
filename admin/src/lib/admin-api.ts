/**
 * Admin-Only API operations layered strictly on solarch.http.
 * Does NOT duplicate transport, token injection, error handling, or query serialization.
 */

import { solarch } from './solarch'

export interface InstallerCheckResponse {
  installed: boolean
}

export interface BackupItem {
  key: string
  name?: string
  size: number
  modified: string | number
  created?: string | number
}

export interface LogItem {
  id?: string
  level: string
  message: string
  created: string
  data?: Record<string, any>
}

export interface LogListResponse {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: LogItem[]
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIChatResponse {
  reply: string
}

export interface AdminMetricsResponse {
  totalCollections: number
  totalRecords: number
  totalAuthUsers: number
}

export interface AISettings {
  enabled: boolean
  provider: string
  apiKey: string
  model: string
  baseURL: string
  temperature: number
  maxTokens: number
}

export interface AdminSettings {
  ai?: AISettings
  [key: string]: any
}

export const adminApi = {
  installer: {
    check(): Promise<InstallerCheckResponse> {
      return solarch.http.get<InstallerCheckResponse>('/api/installer/check')
    },
    install(body: { email?: string; username?: string; password: string; passwordConfirm: string }): Promise<any> {
      return solarch.http.post('/api/installer', { body: { email: body.email || body.username, ...body } })
    },
  },

  metrics: {
    get(): Promise<AdminMetricsResponse> {
      return solarch.http.get<AdminMetricsResponse>('/api/metrics')
    },
  },

  settings: {
    get(): Promise<AdminSettings> {
      return solarch.http.get<AdminSettings>('/api/settings')
    },
    update(settings: Partial<AdminSettings>): Promise<AdminSettings> {
      return solarch.http.patch<AdminSettings>('/api/settings', { body: settings })
    },
    testEmail(to: string, config?: any): Promise<{ success: boolean; message: string }> {
      return solarch.http.post<{ success: boolean; message: string }>('/api/settings/test/email', {
        body: { to, config },
      })
    },
    testS3(config?: any): Promise<{ success: boolean; message: string }> {
      return solarch.http.post<{ success: boolean; message: string }>('/api/settings/test/s3', {
        body: { config },
      })
    },
  },

  ai: {
    test(config?: any): Promise<{ success: boolean; reply?: string; message?: string }> {
      return solarch.http.post<{ success: boolean; reply?: string; message?: string }>('/api/ai/test', {
        body: { config },
      })
    },
    chat(payload: string | AIChatMessage[]): Promise<AIChatResponse> {
      if (typeof payload === 'string') {
        return solarch.http.post<AIChatResponse>('/api/ai/chat', { body: { messages: [{ role: 'user', content: payload }] } })
      }
      return solarch.http.post<AIChatResponse>('/api/ai/chat', { body: { messages: payload } })
    },
    generateCollection(description: string, dryRun: boolean = false): Promise<any> {
      return solarch.http.post('/api/ai/generate-collection', { body: { description, dryRun } })
    },
    generateRule(action: string, description: string): Promise<any> {
      return solarch.http.post('/api/ai/generate-rule', { body: { action, description } })
    },
    seedRecords(collectionName: string, count: number = 5, constraints?: string): Promise<any> {
      return solarch.http.post('/api/ai/seed', { body: { collectionName, count, constraints } })
    },
  },

  logs: {
    getList(page: number = 1, perPage: number = 50, level?: string, search?: string): Promise<LogListResponse> {
      const query: Record<string, any> = { page, perPage }
      if (level && level !== 'all') query.level = level
      if (search && search.trim()) query.search = search.trim()
      return solarch.http.get<LogListResponse>('/api/logs', { query })
    },
  },

  backups: {
    getList(): Promise<BackupItem[]> {
      return solarch.http.get<BackupItem[]>('/api/backups')
    },
    create(name?: string): Promise<{ message?: string; name?: string; key?: string }> {
      return solarch.http.post('/api/backups', { body: name ? { name } : {} })
    },
    restore(key: string): Promise<{ message: string }> {
      return solarch.http.post(`/api/backups/${encodeURIComponent(key)}/restore`)
    },
    delete(key: string): Promise<any> {
      return solarch.http.delete(`/api/backups/${encodeURIComponent(key)}`)
    },
    async upload(file: File): Promise<any> {
      const formData = new FormData()
      formData.append('file', file)
      const token = solarch.authStore.token
      const res = await fetch('/api/backups/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Backup upload failed.')
      }
      return res.json().catch(() => ({}))
    },
  },
}
