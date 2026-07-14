import { AIConfig, defaultAIConfig } from '../ai/provider'

export interface AppSettings {
  appName: string
  appNameVisible: boolean
  appURL: string
  jwtSecret: string
  hideControls: boolean
  senderName: string
  senderAddress: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  metaImageURL: string
  metaRobots: string
  logsMaxDays: number
  backups: BackupsConfig
  smtp: SMTPConfig
  s3: S3Config
  tokenAuth: TokenAuthConfig
  rateLimits: RateLimitsConfig
  batch: BatchConfig
  ai: AIConfig
}

export interface BackupsConfig {
  cron: string
  cronMaxKeep: number
  s3?: S3Config
}

export interface SMTPConfig {
  host: string
  port: number
  username: string
  password: string
  authMethod: 'login' | 'plain' | 'cram-md5' | 'none'
  tls: boolean
  localName: string
}

export interface S3Config {
  enabled: boolean
  bucket: string
  region: string
  endpoint: string
  accessKey: string
  secret: string
  forcePathStyle: boolean
  prefix: string
}

export interface TokenAuthConfig {
  enabled: boolean
}

export interface RateLimitsConfig {
  enabled: boolean
  rules: RateLimitRule[]
}

export interface RateLimitRule {
  duration: number
  requests: number
}

export interface BatchConfig {
  enabled: boolean
  maxBatchSize: number
}

export function defaultSettings(): AppSettings {
  return {
    appName: 'Solarch',
    appNameVisible: false,
    appURL: 'http://localhost:8090',
    jwtSecret: '',
    hideControls: false,
    senderName: '',
    senderAddress: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    metaImageURL: '',
    metaRobots: '',
    logsMaxDays: 14,
    backups: {
      cron: '',
      cronMaxKeep: 3,
    },
    smtp: {
      host: '',
      port: 25,
      username: '',
      password: '',
      authMethod: 'plain',
      tls: false,
      localName: 'localhost',
    },
    s3: {
      enabled: false,
      bucket: '',
      region: '',
      endpoint: '',
      accessKey: '',
      secret: '',
      forcePathStyle: false,
      prefix: '',
    },
    tokenAuth: {
      enabled: false,
    },
    // FIXED[H-6]: Rate limiting enabled by default — 60 req/min per IP
    rateLimits: {
      enabled: true,
      rules: [{ duration: 60, requests: 60 }],
    },
    batch: {
      enabled: true,
      maxBatchSize: 100,
    },
    ai: defaultAIConfig(),
  }
}
