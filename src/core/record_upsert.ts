import { BaseApp } from './base'
import { RecordModel as PBRecord, RecordData } from './record'
import { Collection } from './collection'
import { Field, TextField, NumberField, EmailField, URLField, BoolField, DateField, SelectField, FileField, RelationField, JSONField, EditorField, GeoPointField, VectorField } from './field'

export interface ValidationError {
  field: string
  message: string
}

export interface RecordUpsertOptions {
  data: Record<string, any>
  collection: Collection
  record?: PBRecord | null
  requestInfo?: any
}

export class RecordUpsertForm {
  private app: BaseApp
  private collection: Collection
  private record: PBRecord | null
  private data: Record<string, any>
  private errors: ValidationError[] = []

  constructor(app: BaseApp, options: RecordUpsertOptions) {
    this.app = app
    this.collection = options.collection
    this.record = options.record ?? null
    this.data = this.stripProtectedFields(options.data, this.record)
  }

  private stripProtectedFields(data: Record<string, any>, existingRecord: PBRecord | null): Record<string, any> {
    const protectedFields = [
      'id',
      'created',
      'createdAt',
      'updated',
      'updatedAt',
      '_isAdmin',
      'isAdmin',
      'role',
      'verified',
      'verifiedAt',
      'lastResetSentAt',
      'lastLoginAt',
      'lastVerifiedAt',
      'mfaEnabled',
      'mfaSecret',
      'passwordHash',   // FIXED[C-1]: Block direct password hash assignment from user input
      'emailVisibility', // FIXED[C-1]: Block user from overriding email visibility default
    ]

    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      const resolvedKey = key.startsWith('+') ? key.slice(1) : key.endsWith('-') ? key.slice(0, -1) : key
      if (!protectedFields.includes(resolvedKey)) {
        if (key.startsWith('_') && !['username', 'email'].includes(key)) continue
        sanitized[key] = value
      }
    }

    if (existingRecord && this.collection.isAuth()) {
      const currentVerified = existingRecord.get('verified')
      const newVerified = sanitized.verified
      if (newVerified !== undefined && newVerified !== currentVerified) {
        sanitized.verified = currentVerified
      }
    }

    return sanitized
  }

  validate(): ValidationError[] {
    this.errors = []

    for (const field of this.collection.fields) {
      const value = this.data[field.name]

      if (field.system && !['email', 'username'].includes(field.name)) continue

      if (field.required) {
        if (value === undefined || value === null || value === '') {
          this.errors.push({ field: field.name, message: `Field "${field.name}" is required.` })
          continue
        }
      }

      const error = field.validate(value)
      if (error) {
        this.errors.push({ field: field.name, message: error.message })
      }

      if (this.collection.isAuth()) {
        this.validateAuthField(field, value)
      }
    }

    if (this.collection.isAuth()) {
      this.validatePasswordFields()
    }

    return this.errors
  }

  isValid(): boolean {
    this.validate()
    return this.errors.length === 0
  }

  getErrors(): ValidationError[] {
    return this.errors
  }

  private validateAuthField(field: Field, value: any): void {
    if (field.name === 'email' && value) {
      const emailStr = String(value)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        this.errors.push({ field: 'email', message: 'Invalid email format.' })
      }

      if (this.collection.authOptions?.onlyEmailDomains?.length) {
        const domain = emailStr.split('@')[1]
        if (!this.collection.authOptions.onlyEmailDomains.includes(domain)) {
          this.errors.push({ field: 'email', message: `Email domain not allowed.` })
        }
      }

      if (this.collection.authOptions?.exceptEmailDomains?.length) {
        const domain = emailStr.split('@')[1]
        if (this.collection.authOptions.exceptEmailDomains.includes(domain)) {
          this.errors.push({ field: 'email', message: `Email domain not allowed.` })
        }
      }
    }
  }

  private validatePasswordFields(): void {
    const password = this.data.password
    const passwordConfirm = this.data.passwordConfirm
    const oldPassword = this.data.oldPassword
    const newPassword = this.data.newPassword
    const newPasswordConfirm = this.data.newPasswordConfirm

    const minLength = this.collection.authOptions?.minPasswordLength ?? 8

    if (password !== undefined) {
      if (password.length < minLength) {
        this.errors.push({ field: 'password', message: `Password must be at least ${minLength} characters.` })
      }
      if (passwordConfirm !== undefined && password !== passwordConfirm) {
        this.errors.push({ field: 'passwordConfirm', message: 'Passwords do not match.' })
      }
    }

    if (newPassword !== undefined) {
      if (newPassword.length < minLength) {
        this.errors.push({ field: 'newPassword', message: `Password must be at least ${minLength} characters.` })
      }
      if (newPasswordConfirm !== undefined && newPassword !== newPasswordConfirm) {
        this.errors.push({ field: 'newPasswordConfirm', message: 'Passwords do not match.' })
      }
      if (oldPassword === undefined && this.record) {
        this.errors.push({ field: 'oldPassword', message: 'Current password is required.' })
      }
    }
  }

  buildRecord(): PBRecord {
    const recordData: RecordData = {
      id: this.record?.id,
      collectionId: this.collection.id,
      collectionName: this.collection.name,
    }

    if (this.record) {
      for (const key of this.record.keys()) {
        recordData[key] = this.record.get(key)
      }
    }

    for (const [key, value] of Object.entries(this.data)) {
      if (['password', 'passwordConfirm', 'oldPassword', 'newPassword', 'newPasswordConfirm'].includes(key)) {
        continue
      }

      if (key.startsWith('+')) {
        const fieldName = key.slice(1)
        const existing = recordData[fieldName] || []
        const existingArr = Array.isArray(existing) ? existing : [existing]
        const newArr = Array.isArray(value) ? value : [value]
        recordData[fieldName] = [...existingArr, ...newArr]
        continue
      }

      if (key.endsWith('-')) {
        const fieldName = key.slice(0, -1)
        const existing = recordData[fieldName] || []
        if (Array.isArray(existing)) {
          const toRemove = Array.isArray(value) ? value : [value]
          recordData[fieldName] = existing.filter((v: any) => !toRemove.includes(v))
        }
        continue
      }

      recordData[key] = value
    }

    for (const field of this.collection.fields) {
      if (field.type === 'autodate') {
        const autoDateField = field as any
        if (autoDateField.onInit && !this.record) {
          recordData[field.name] = new Date().toISOString()
        }
        if (autoDateField.onUpdate) {
          recordData[field.name] = new Date().toISOString()
        }
      }
    }

    if (!this.record && this.collection.isAuth()) {
      if (!('emailVisibility' in recordData)) {
        recordData.emailVisibility = this.data.emailVisibility ?? true
      }
      if (!('verified' in recordData)) {
        recordData.verified = this.data.verified ?? false
      }
    }

    const record = new PBRecord(this.collection.id, this.collection.name, recordData)

    if (!this.record && this.collection.isAuth()) {
      record.set('emailVisibility', this.data.emailVisibility ?? true)
      record.set('verified', this.data.verified ?? false)
    }

    return record
  }
}

export async function validateAndCreateRecord(
  app: BaseApp,
  collection: Collection,
  data: Record<string, any>
): Promise<{ record: PBRecord; errors: ValidationError[] }> {
  const form = new RecordUpsertForm(app, { data, collection })
  const errors = form.validate()

  if (errors.length > 0) {
    return { record: null as any, errors }
  }

  const record = form.buildRecord()

  if (data.password) {
    record.set('passwordHash', await app.hashPassword(data.password))
  }

  return { record, errors: [] }
}

export async function validateAndUpdateRecord(
  app: BaseApp,
  collection: Collection,
  existingRecord: PBRecord,
  data: Record<string, any>
): Promise<{ record: PBRecord; errors: ValidationError[] }> {
  const form = new RecordUpsertForm(app, { data, collection, record: existingRecord })
  const errors = form.validate()

  if (errors.length > 0) {
    return { record: null as any, errors }
  }
  const isPasswordChange = data.newPassword !== undefined || data.password !== undefined
  if (isPasswordChange && collection.isAuth()) {
    const storedHash = existingRecord.get('passwordHash')
    if (storedHash) {
      const valid = await app.verifyPassword(data.oldPassword || '', storedHash)
      if (!valid) {
        return { record: null as any, errors: [{ field: 'oldPassword', message: 'Incorrect password.' }] }
      }
    }
  }

  const record = form.buildRecord()

  if (data.newPassword) {
    record.set('passwordHash', await app.hashPassword(data.newPassword))
  } else if (data.password) {
    record.set('passwordHash', await app.hashPassword(data.password))
  }

  return { record, errors: [] }
}
