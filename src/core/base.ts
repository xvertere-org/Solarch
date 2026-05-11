import { Hook, TaggedHook } from '../tools/hook/hook'
import { Store } from '../tools/store/store'
import { DB } from './db'
import { defaultSettings, AppSettings } from './settings'
import { Collection } from './collection'
import { RecordModel as PBRecord } from './record'
import {
  BootstrapEvent, ServeEvent, TerminateEvent, ModelEvent, ModelErrorEvent,
  RecordEvent, RecordErrorEvent, RecordEnrichEvent, CollectionEvent, BackupEvent
} from './events'
import { DateTime } from '../tools/types/types'
import { hashPassword, verifyPassword, parseJWT } from '../tools/security/crypto'
import jwt from 'jsonwebtoken'
import { SettingsEncryption } from './settings_encrypt'
import path from 'path'

export interface BaseAppConfig {
  isDev: boolean
  dataDir: string
  encryptionEnv?: string
  queryTimeout?: number
  dataMaxOpenConns?: number
  dataMaxIdleConns?: number
  auxMaxOpenConns?: number
  auxMaxIdleConns?: number
}

export class BaseApp {
  private bootstrapped = false
  private _db: DB | null = null
  private _settings: AppSettings | null = null
  private _store = new Store<string, any>()
  private _collectionCache = new Map<string, Collection>()

  readonly isDev: boolean
  readonly dataDir: string
  readonly encryptionEnv: string
  readonly queryTimeout: number

  readonly onBootstrap = new Hook<BootstrapEvent>()
  readonly onServe = new Hook<ServeEvent>()
  readonly onTerminate = new Hook<TerminateEvent>()
  readonly onBackupCreate = new Hook<BackupEvent>()
  readonly onBackupRestore = new Hook<BackupEvent>()

  readonly onModelValidate = new TaggedHook<ModelEvent>()
  readonly onModelCreate = new TaggedHook<ModelEvent>()
  readonly onModelCreateExecute = new TaggedHook<ModelEvent>()
  readonly onModelAfterCreateSuccess = new TaggedHook<ModelEvent>()
  readonly onModelAfterCreateError = new TaggedHook<ModelErrorEvent>()
  readonly onModelUpdate = new TaggedHook<ModelEvent>()
  readonly onModelUpdateExecute = new TaggedHook<ModelEvent>()
  readonly onModelAfterUpdateSuccess = new TaggedHook<ModelEvent>()
  readonly onModelAfterUpdateError = new TaggedHook<ModelErrorEvent>()
  readonly onModelDelete = new TaggedHook<ModelEvent>()
  readonly onModelDeleteExecute = new TaggedHook<ModelEvent>()
  readonly onModelAfterDeleteSuccess = new TaggedHook<ModelEvent>()
  readonly onModelAfterDeleteError = new TaggedHook<ModelErrorEvent>()

  readonly onRecordEnrich = new TaggedHook<RecordEnrichEvent>()
  readonly onRecordValidate = new TaggedHook<RecordEvent>()
  readonly onRecordCreate = new TaggedHook<RecordEvent>()
  readonly onRecordCreateExecute = new TaggedHook<RecordEvent>()
  readonly onRecordAfterCreateSuccess = new TaggedHook<RecordEvent>()
  readonly onRecordAfterCreateError = new TaggedHook<RecordErrorEvent>()
  readonly onRecordUpdate = new TaggedHook<RecordEvent>()
  readonly onRecordUpdateExecute = new TaggedHook<RecordEvent>()
  readonly onRecordAfterUpdateSuccess = new TaggedHook<RecordEvent>()
  readonly onRecordAfterUpdateError = new TaggedHook<RecordErrorEvent>()
  readonly onRecordDelete = new TaggedHook<RecordEvent>()
  readonly onRecordDeleteExecute = new TaggedHook<RecordEvent>()
  readonly onRecordAfterDeleteSuccess = new TaggedHook<RecordEvent>()
  readonly onRecordAfterDeleteError = new TaggedHook<RecordErrorEvent>()

  readonly onCollectionValidate = new TaggedHook<CollectionEvent>()
  readonly onCollectionCreate = new TaggedHook<CollectionEvent>()
  readonly onCollectionCreateExecute = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterCreateSuccess = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterCreateError = new TaggedHook<CollectionEvent>()
  readonly onCollectionUpdate = new TaggedHook<CollectionEvent>()
  readonly onCollectionUpdateExecute = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterUpdateSuccess = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterUpdateError = new TaggedHook<CollectionEvent>()
  readonly onCollectionDelete = new TaggedHook<CollectionEvent>()
  readonly onCollectionDeleteExecute = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterDeleteSuccess = new TaggedHook<CollectionEvent>()
  readonly onCollectionAfterDeleteError = new TaggedHook<CollectionEvent>()

  constructor(config: BaseAppConfig) {
    this.isDev = config.isDev
    this.dataDir = config.dataDir
    this.encryptionEnv = config.encryptionEnv ?? ''
    this.queryTimeout = config.queryTimeout ?? 30
  }

  isBootstrapped(): boolean {
    return this.bootstrapped
  }

  async bootstrap(): Promise<void> {
    if (this.bootstrapped) {
      await this.resetBootstrapState()
    }

    this._db = new DB({
      dataDir: this.dataDir,
      isDev: this.isDev,
      queryTimeout: this.queryTimeout,
    })

    this._settings = defaultSettings()

    await this.runSystemMigrations()

    await this.reloadSettings()
    await this.reloadCachedCollections()

    this.bootstrapped = true

    await this.onBootstrap.trigger({ app: this })
  }

  async resetBootstrapState(): Promise<void> {
    if (this._db) {
      this._db.close()
      this._db = null
    }
    this.bootstrapped = false
    this._collectionCache.clear()
  }

  getFilesystem(): any {
    const { Filesystem } = require('../tools/filesystem/filesystem')
    return new Filesystem({
      dataDir: this.dataDir,
      s3Config: this._settings?.s3,
    })
  }

  db(): DB {
    if (!this._db) throw new Error('Database not initialized. Call bootstrap() first.')
    return this._db
  }

  settings(): AppSettings {
    if (!this._settings) throw new Error('Settings not initialized. Call bootstrap() first.')
    return this._settings
  }

  store(): Store<string, any> {
    return this._store
  }

  async reloadSettings(): Promise<void> {
    if (!this._db) return
    const db = this._db.getDataDB()
    const row = db.prepare("SELECT value FROM _settings WHERE key = 'main'").get() as { value: string } | undefined
    if (row) {
      try {
        const parsed = JSON.parse(row.value)
        const encryption = new SettingsEncryption(this)
        const decrypted = encryption.decryptSettings(parsed)
        this._settings = { ...defaultSettings(), ...decrypted }
      } catch {
        this._settings = defaultSettings()
      }
    }
  }

  async reloadCachedCollections(): Promise<void> {
    if (!this._db) return
    const db = this._db.getDataDB()
    const rows = db.prepare("SELECT * FROM _collections").all() as any[]
    this._collectionCache.clear()
    for (const row of rows) {
      const data = JSON.parse(row.data)
      const collection = new Collection({
        ...data,
        id: row.id,
        name: row.name,
        created: row.created,
        updated: row.updated,
      })
      this._collectionCache.set(collection.id, collection)
      this._collectionCache.set(collection.name.toLowerCase(), collection)
    }
  }

  async findCollectionByNameOrId(nameOrId: string): Promise<Collection | null> {
    if (!this._db) throw new Error('Database not initialized')
    const cached = this._collectionCache.get(nameOrId.toLowerCase())
    if (cached) return cached

    const db = this._db.getDataDB()
    const row = db.prepare("SELECT * FROM _collections WHERE id = ? OR LOWER(name) = LOWER(?)").get(nameOrId, nameOrId) as any
    if (!row) return null

    const data = JSON.parse(row.data)
    const collection = new Collection({
      ...data,
      id: row.id,
      name: row.name,
      created: row.created,
      updated: row.updated,
    })
    this._collectionCache.set(collection.id, collection)
    this._collectionCache.set(collection.name.toLowerCase(), collection)
    return collection
  }

  findCachedCollectionByNameOrId(nameOrId: string): Collection | null {
    return this._collectionCache.get(nameOrId.toLowerCase()) ?? this._collectionCache.get(nameOrId) ?? null
  }

  async findAllCollections(types?: string[]): Promise<Collection[]> {
    if (!this._db) throw new Error('Database not initialized')
    const db = this._db.getDataDB()
    const rows = db.prepare("SELECT data FROM _collections").all() as { data: string }[]
    const collections = rows.map(row => new Collection(JSON.parse(row.data)))
    if (types && types.length > 0) {
      return collections.filter(c => types.includes(c.type))
    }
    return collections
  }

  async save(model: any): Promise<void> {
    if (!this._db) throw new Error('Database not initialized')

    await this.onModelValidate.trigger({ app: this, model })

    if (model instanceof PBRecord) {
      await this.onRecordValidate.triggerForTag(model.collectionId, { app: this, record: model })
    }

    const db = this._db.getDataDB()
    const now = new Date().toISOString()

    if (model.isNew()) {
      model.created = new Date(now)
      model.updated = new Date(now)
      model.markAsNotNew()

      await this.onModelCreate.trigger({ app: this, model })
      await this.onModelCreateExecute.trigger({ app: this, model })

      if (model instanceof Collection) {
        db.prepare("INSERT INTO _collections (id, name, data, created, updated) VALUES (?, ?, ?, ?, ?)").run(
          model.id, model.name, JSON.stringify(model.toJSON()), model.created.toISOString(), model.updated.toISOString()
        )
        this._collectionCache.set(model.id, model)
        this._collectionCache.set(model.name.toLowerCase(), model)

        // Create record table for base and auth collections
        if (model.isBase() || model.isAuth()) {
          const columns = ['id TEXT PRIMARY KEY', 'created TEXT', 'updated TEXT', 'collectionId TEXT', 'collectionName TEXT']

          // Auth collections get extra columns
          if (model.isAuth()) {
            columns.push('email TEXT UNIQUE')
            columns.push('emailVisibility INTEGER DEFAULT 1')
            columns.push('passwordHash TEXT')
            columns.push('verified INTEGER DEFAULT 0')
            columns.push('lastResetSentAt TEXT')
            columns.push('lastVerificationSentAt TEXT')
            columns.push('lastLoginAt TEXT')
          }

          for (const field of model.fields) {
            if (field.type === 'number') {
              columns.push(`${field.name} REAL`)
            } else if (field.type === 'bool') {
              columns.push(`${field.name} INTEGER DEFAULT 0`)
            } else if (field.type === 'json') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'file') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'relation') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'select') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'date') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'email') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'url') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'editor') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'geoPoint') {
              columns.push(`${field.name} TEXT`)
            } else if (field.type === 'autodate') {
              columns.push(`${field.name} TEXT`)
            } else {
              columns.push(`${field.name} TEXT`)
            }
          }
          db.exec(`CREATE TABLE IF NOT EXISTS _r_${model.id} (${columns.join(', ')})`)
        }
      } else if (model instanceof PBRecord) {
        const tableName = `_r_${model.collectionId}`
        const columns = ['id', 'created', 'updated', 'collectionId', 'collectionName']
        const values: any[] = [model.id, model.created.toISOString(), model.updated.toISOString(), model.collectionId, model.collectionName]
        const placeholders = ['?', '?', '?', '?', '?']

        for (const [key, value] of model.entries()) {
          columns.push(key)
          if (typeof value === 'boolean') {
            values.push(value ? 1 : 0)
          } else if (typeof value === 'object') {
            values.push(JSON.stringify(value))
          } else {
            values.push(value)
          }
          placeholders.push('?')
        }

        db.prepare(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`).run(...values)
      } else {
        const tableName = model.tableName()
        db.prepare(`INSERT INTO ${tableName} (id, created, updated, data) VALUES (?, ?, ?, ?)`).run(
          model.id, now, now, JSON.stringify(model.toJSON())
        )
      }

      await this.onModelAfterCreateSuccess.trigger({ app: this, model })
      if (model instanceof PBRecord) {
        await this.onRecordAfterCreateSuccess.triggerForTag(model.collectionId, { app: this, record: model })
      }
    } else {
      model.updated = new Date(now)

      await this.onModelUpdate.trigger({ app: this, model })
      await this.onModelUpdateExecute.trigger({ app: this, model })

      if (model instanceof Collection) {
        db.prepare("UPDATE _collections SET name = ?, data = ?, updated = ? WHERE id = ?").run(
          model.name, JSON.stringify(model.toJSON()), now, model.id
        )
        this._collectionCache.set(model.id, model)
        this._collectionCache.set(model.name.toLowerCase(), model)
      } else if (model instanceof PBRecord) {
        const tableName = `_r_${model.collectionId}`
        const setClauses = ['updated = ?']
        const values: any[] = [now]

        for (const [key, value] of model.entries()) {
          setClauses.push(`${key} = ?`)
          if (typeof value === 'boolean') {
            values.push(value ? 1 : 0)
          } else if (typeof value === 'object') {
            values.push(JSON.stringify(value))
          } else {
            values.push(value)
          }
        }

        values.push(model.id)
        db.prepare(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
      } else {
        const tableName = model.tableName()
        db.prepare(`UPDATE ${tableName} SET data = ?, updated = ? WHERE id = ?`).run(
          JSON.stringify(model.toJSON()), now, model.id
        )
      }

      await this.onModelAfterUpdateSuccess.trigger({ app: this, model })
      if (model instanceof PBRecord) {
        await this.onRecordAfterUpdateSuccess.triggerForTag(model.collectionId, { app: this, record: model })
      }
    }
  }

  async delete(model: any): Promise<void> {
    if (!this._db) throw new Error('Database not initialized')

    await this.onModelDelete.trigger({ app: this, model })
    await this.onModelDeleteExecute.trigger({ app: this, model })

    const db = this._db.getDataDB()

    if (model instanceof Collection) {
      db.prepare("DELETE FROM _collections WHERE id = ?").run(model.id)
      this._collectionCache.delete(model.id)
      this._collectionCache.delete(model.name.toLowerCase())
      db.exec(`DROP TABLE IF EXISTS _r_${model.id}`)
    } else if (model instanceof PBRecord) {
      const tableName = `_r_${model.collectionId}`
      db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(model.id)

      // Nullify relations pointing to this record
      const collections = await this.findAllCollections()
      for (const col of collections) {
        for (const field of col.fields) {
          if (field.type === 'relation') {
            const relField = field as any
            if (relField.collectionId === model.collectionId) {
              const refTable = `_r_${col.id}`
              db.prepare(`UPDATE "${refTable}" SET "${field.name}" = NULL WHERE "${field.name}" = ?`).run(model.id)
            }
          }
        }
      }

      // Clean up associated files
      try {
        const fsys = this.getFilesystem()
        const col = await this.findCollectionByNameOrId(model.collectionId)
        if (col) {
          for (const field of col.fields) {
            if (field.type === 'file') {
              const files = model.get(field.name)
              if (Array.isArray(files)) {
                for (const f of files) {
                  const storageKey = `${model.collectionName}/${model.id}/${f}`
                  await fsys.deleteFile(storageKey).catch(() => {})
                }
              }
            }
          }
        }
      } catch {}
    } else {
      const tableName = model.tableName()
      db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(model.id)
    }

    await this.onModelAfterDeleteSuccess.trigger({ app: this, model })
    if (model instanceof PBRecord) {
      await this.onRecordAfterDeleteSuccess.triggerForTag(model.collectionId, { app: this, record: model })
    }
  }



  async runSystemMigrations(): Promise<void> {
    if (!this._db) return
    const db = this._db.getDataDB()

    db.exec(`
      CREATE TABLE IF NOT EXISTS _collections (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        created TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _mfas (
        id TEXT PRIMARY KEY,
        recordRef TEXT NOT NULL,
        collectionId TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'totp',
        secret TEXT DEFAULT '',
        backupCodes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    try { db.exec('ALTER TABLE _mfas ADD COLUMN secret TEXT DEFAULT \'\'') } catch {}
    try { db.exec('ALTER TABLE _mfas ADD COLUMN backupCodes TEXT DEFAULT \'\'') } catch {}

    db.exec(`
      CREATE TABLE IF NOT EXISTS _otps (
        id TEXT PRIMARY KEY,
        recordRef TEXT NOT NULL,
        collectionId TEXT NOT NULL,
        password TEXT NOT NULL,
        sentTo TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        requestIp TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _authOrigins (
        id TEXT PRIMARY KEY,
        recordRef TEXT NOT NULL,
        collectionId TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        authMethod TEXT NOT NULL DEFAULT 'password',
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        lastSeenAt TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _externalAuths (
        id TEXT PRIMARY KEY,
        recordRef TEXT NOT NULL,
        collectionId TEXT NOT NULL,
        provider TEXT NOT NULL,
        providerId TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _tokenRevocations (
        id TEXT PRIMARY KEY,
        tokenHash TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        recordRef TEXT,
        expiresAt TEXT NOT NULL,
        created TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _oauth2States (
        state TEXT PRIMARY KEY,
        collectionId TEXT NOT NULL,
        redirectUri TEXT,
        expiresAt TEXT NOT NULL,
        created TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _passwordResetTokens (
        tokenHash TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        usedAt TEXT,
        created TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _agentWorkflows (
        id TEXT PRIMARY KEY,
        workflowId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        definition TEXT NOT NULL,
        version TEXT DEFAULT '1',
        enabled INTEGER DEFAULT 1,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS _agentExecutions (
        id TEXT PRIMARY KEY,
        workflowId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger TEXT DEFAULT 'manual',
        input TEXT DEFAULT '{}',
        output TEXT DEFAULT 'null',
        results TEXT DEFAULT '[]',
        duration REAL DEFAULT 0,
        error TEXT DEFAULT '',
        created TEXT NOT NULL
      )
    `)

    try { db.exec('ALTER TABLE _agentWorkflows ADD COLUMN description TEXT DEFAULT \'\'') } catch {}
    try { db.exec('ALTER TABLE _agentWorkflows ADD COLUMN version TEXT DEFAULT \'1\'') } catch {}
    try { db.exec('ALTER TABLE _agentWorkflows ADD COLUMN enabled INTEGER DEFAULT 1') } catch {}

    const now = new Date().toISOString()
    db.prepare("INSERT OR IGNORE INTO _settings (key, value, created, updated) VALUES (?, ?, ?, ?)").run(
      'main', JSON.stringify(defaultSettings()), now, now
    )
  }

  async runAppMigrations(): Promise<void> {
  }

  async runAllMigrations(): Promise<void> {
    await this.runSystemMigrations()
    await this.runAppMigrations()
  }

  hashPassword(password: string): Promise<string> {
    return hashPassword(password)
  }

  verifyPassword(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash)
  }

  generateJWT(payload: { [key: string]: any }, secret: string, expiration: string = '720h'): string {
    if (!secret) {
      throw new Error('JWT_SECRET is required. Configure jwtSecret in settings.')
    }
    return jwt.sign(payload, secret, { expiresIn: expiration } as jwt.SignOptions)
  }

  getJwtSecret(): string {
    const envSecret = process.env.JWT_SECRET || process.env.TSPOONBASE_JWT_SECRET
    if (envSecret) {
      if (envSecret.length < 32) {
        this.logger().warn('JWT_SECRET should be at least 32 characters for security!')
      }
      return envSecret
    }
    const secret = this._settings?.jwtSecret
    if (secret && secret.length >= 16) {
      return secret
    }
    const fallback = this._settings?.appName || 'tspoonbase-default-secret'
    this.logger().warn('JWT_SECRET not configured - using appName. Set JWT_SECRET env var or jwtSecret in Admin UI for production!')
    return fallback
  }

  getJwtSecretSafe(): string {
    return this._settings?.jwtSecret || ''
  }

  parseJWT(token: string, secret: string): { [key: string]: any } | null {
    return parseJWT(token, secret)
  }

  revokeToken(token: string, type: string, recordRef?: string, ttlMinutes = 60): void {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    const id = crypto.randomBytes(8).toString('hex')
    db.prepare(
      `INSERT OR REPLACE INTO _tokenRevocations (id, tokenHash, type, recordRef, expiresAt, created) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, tokenHash, type, recordRef || null, expiresAt, now)
  }

  isTokenRevoked(token: string, type: string): boolean {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = db.prepare(
      `SELECT * FROM _tokenRevocations WHERE tokenHash = ? AND type = ? AND expiresAt > ?`
    ).get(tokenHash, type, new Date().toISOString()) as any
    return !!row
  }

  createOAuth2State(collectionId: string, redirectUri?: string, ttlMinutes = 10): string {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const state = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT OR REPLACE INTO _oauth2States (state, collectionId, redirectUri, expiresAt, created) VALUES (?, ?, ?, ?, ?)`
    ).run(state, collectionId, redirectUri || null, expiresAt, now)
    return state
  }

  revokePasswordResetToken(token: string, type: string): boolean {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = db.prepare(
      `SELECT * FROM _passwordResetTokens WHERE tokenHash = ? AND type = ? AND usedAt IS NULL AND expiresAt > ?`
    ).get(tokenHash, type, new Date().toISOString()) as any
    if (!row) return false
    db.prepare(`UPDATE _passwordResetTokens SET usedAt = ? WHERE tokenHash = ? AND type = ?`).run(
      new Date().toISOString(), tokenHash, type
    )
    return true
  }

  isPasswordResetTokenValid(token: string, type: string): boolean {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = db.prepare(
      `SELECT * FROM _passwordResetTokens WHERE tokenHash = ? AND type = ? AND usedAt IS NULL AND expiresAt > ?`
    ).get(tokenHash, type, new Date().toISOString()) as any
    return !!row
  }

  createPasswordResetToken(userId: string, type: string, ttlHours = 1): string {
    const db = this.db().getDataDB()
    const crypto = require('crypto')
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT OR REPLACE INTO _passwordResetTokens (tokenHash, userId, type, expiresAt, created) VALUES (?, ?, ?, ?, ?)`
    ).run(tokenHash, userId, type, expiresAt, now)
    return token
  }

  logger(): any {
    return {
      info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ?? ''),
      error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data ?? ''),
      warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data ?? ''),
      debug: (msg: string, data?: any) => { if (this.isDev) console.debug(`[DEBUG] ${msg}`, data ?? '') },
    }
  }
}
