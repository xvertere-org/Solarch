import { BaseModel } from './model'
import { Field, fieldFromJSON } from './field'
import { validateIdentifier } from '../utils/sql_safe'

export type CollectionType = 'base' | 'auth' | 'view'

export interface CollectionAuthOptions {
  allowEmailAuth: boolean
  allowOAuth2Auth: boolean
  allowUsernameAuth: boolean
  exceptEmailDomains: string[]
  manageRule: string | null
  minPasswordLength: number
  onlyEmailDomains: string[]
  onlyVerified: boolean
  requireEmail: boolean
  usernameField: string
}

export interface CollectionViewOptions {
  query: string
}

export interface CollectionData {
  id?: string
  created?: string
  updated?: string
  name: string
  type: CollectionType
  system?: boolean
  listRule?: string | null
  viewRule?: string | null
  createRule?: string | null
  updateRule?: string | null
  deleteRule?: string | null
  fields?: Record<string, any>[]
  indexes?: string[]
  authOptions?: Partial<CollectionAuthOptions>
  viewOptions?: Partial<CollectionViewOptions>
}

export class Collection extends BaseModel {
  name: string
  type: CollectionType
  system: boolean
  listRule: string | null
  viewRule: string | null
  createRule: string | null
  updateRule: string | null
  deleteRule: string | null
  fields: Field[]
  indexes: string[]
  authOptions: CollectionAuthOptions | null
  viewOptions: CollectionViewOptions | null

  constructor(data: CollectionData) {
    super(data)
    this.name = data.name
    validateIdentifier(this.name, 'collection name')
    this.type = data.type
    this.system = data.system ?? false
    this.listRule = data.listRule ?? null
    this.viewRule = data.viewRule ?? null
    this.createRule = data.createRule ?? null
    this.updateRule = data.updateRule ?? null
    this.deleteRule = data.deleteRule ?? null
    this.fields = (data.fields ?? []).map(f => fieldFromJSON(f))
    this.indexes = data.indexes ?? []
    this.authOptions = data.authOptions ? {
      allowEmailAuth: data.authOptions.allowEmailAuth ?? false,
      allowOAuth2Auth: data.authOptions.allowOAuth2Auth ?? false,
      allowUsernameAuth: data.authOptions.allowUsernameAuth ?? false,
      exceptEmailDomains: data.authOptions.exceptEmailDomains ?? [],
      manageRule: data.authOptions.manageRule ?? null,
      minPasswordLength: data.authOptions.minPasswordLength ?? 8,
      onlyEmailDomains: data.authOptions.onlyEmailDomains ?? [],
      onlyVerified: data.authOptions.onlyVerified ?? false,
      requireEmail: data.authOptions.requireEmail ?? false,
      usernameField: data.authOptions.usernameField ?? 'username',
    } : null
    this.viewOptions = data.viewOptions ? {
      query: data.viewOptions.query ?? '',
    } : null
  }

  tableName(): string {
    return '_collections'
  }

  isAuth(): boolean {
    return this.type === 'auth'
  }

  isBase(): boolean {
    return this.type === 'base'
  }

  isView(): boolean {
    return this.type === 'view'
  }

  getFieldByName(name: string): Field | undefined {
    return this.fields.find(f => f.name === name)
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      name: this.name,
      type: this.type,
      system: this.system,
      listRule: this.listRule,
      viewRule: this.viewRule,
      createRule: this.createRule,
      updateRule: this.updateRule,
      deleteRule: this.deleteRule,
      fields: this.fields.map(f => f.toJSON()),
      indexes: this.indexes,
      authOptions: this.authOptions,
      viewOptions: this.viewOptions,
    }
  }
}
