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

export interface AIChatResponse {
  reply: string
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
    install(body: { email: string; password: string; passwordConfirm: string }): Promise<any> {
      return solarch.http.post('/api/installer', { body })
    },
  },

  settings: {
    get(): Promise<AdminSettings> {
      return solarch.http.get<AdminSettings>('/api/settings')
    },
    update(settings: Partial<AdminSettings>): Promise<AdminSettings> {
      return solarch.http.patch<AdminSettings>('/api/settings', { body: settings })
    },
  },

  ai: {
    test(): Promise<{ reply?: string }> {
      return solarch.http.post<{ reply?: string }>('/api/ai/test', {})
    },
    chat(message: string): Promise<AIChatResponse> {
      return solarch.http.post<AIChatResponse>('/api/ai/chat', { body: { message } })
    },
  },

  logs: {
    getList(page: number = 1, perPage: number = 50): Promise<LogListResponse> {
      return solarch.http.get<LogListResponse>('/api/logs', {
        query: { page, perPage },
      })
    },
  },

  backups: {
    getList(): Promise<BackupItem[]> {
      return solarch.http.get<BackupItem[]>('/api/backups')
    },
    create(name?: string): Promise<{ message?: string; name?: string }> {
      return solarch.http.post('/api/backups', { body: name ? { name } : {} })
    },
    delete(key: string): Promise<any> {
      return solarch.http.delete(`/api/backups/${encodeURIComponent(key)}`)
    },
  },
}
