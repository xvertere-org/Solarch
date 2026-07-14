import { BaseModel } from './model'
import { Collection } from './collection'

export interface RecordData {
  id?: string
  created?: string
  updated?: string
  collectionId?: string
  collectionName?: string
  [key: string]: any
}

export class RecordModel extends BaseModel {
  collectionId: string
  collectionName: string
  private data: Map<string, any>
  private hiddenFields: Set<string>
  private customData: Record<string, any>

  constructor(collectionId: string, collectionName: string, data?: RecordData) {
    super(data)
    this.collectionId = collectionId
    this.collectionName = collectionName
    this.data = new Map()
    this.hiddenFields = new Set()
    this.customData = {}

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (!['id', 'created', 'updated', 'collectionId', 'collectionName'].includes(key)) {
          this.data.set(key, value)
        }
      }
    }
  }

  get(key: string): any {
    if (key === 'id') return this.id
    if (key === 'created') return this.created
    if (key === 'updated') return this.updated
    if (key === 'collectionId') return this.collectionId
    if (key === 'collectionName') return this.collectionName
    return this.data.get(key)
  }

  set(key: string, value: any): void {
    this.data.set(key, value)
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  delete(key: string): boolean {
    return this.data.delete(key)
  }

  keys(): string[] {
    return Array.from(this.data.keys())
  }

  entries(): [string, any][] {
    return Array.from(this.data.entries())
  }

  hide(key: string): void {
    this.hiddenFields.add(key)
  }

  unhide(key: string): void {
    this.hiddenFields.delete(key)
  }

  isHidden(key: string): boolean {
    return this.hiddenFields.has(key)
  }

  withCustomData(enabled: boolean): void {
    if (!enabled) {
      this.customData = {}
    }
  }

  setCustom(key: string, value: any): void {
    this.customData[key] = value
  }

  getCustom(key: string): any {
    return this.customData[key]
  }

  getString(key: string, defaultValue = ''): string {
    const val = this.data.get(key)
    return val != null ? String(val) : defaultValue
  }

  getInt(key: string, defaultValue = 0): number {
    const val = this.data.get(key)
    return val != null ? parseInt(val, 10) : defaultValue
  }

  getFloat(key: string, defaultValue = 0): number {
    const val = this.data.get(key)
    return val != null ? parseFloat(val) : defaultValue
  }

  getBool(key: string, defaultValue = false): boolean {
    const val = this.data.get(key)
    if (val === null || val === undefined) return defaultValue
    return Boolean(val)
  }

  tableName(): string {
    return `_r_${this.collectionId}`
  }

  toJSON(expand?: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {
      id: this.id,
      created: this.created.toISOString(),
      updated: this.updated.toISOString(),
      collectionId: this.collectionId,
      collectionName: this.collectionName,
    }

    for (const [key, value] of this.data.entries()) {
      if (!this.hiddenFields.has(key)) {
        result[key] = value
      }
    }

    for (const [key, value] of Object.entries(this.customData)) {
      result[key] = value
    }

    const finalExpand = expand || (this as any)._expand
    if (finalExpand) {
      const serializedExpand: Record<string, any> = {}
      for (const [key, val] of Object.entries(finalExpand)) {
        if (Array.isArray(val)) {
          serializedExpand[key] = val.map(item => item instanceof RecordModel ? item.toJSON((item as any)._expand) : item)
        } else if (val instanceof RecordModel) {
          serializedExpand[key] = val.toJSON((val as any)._expand)
        } else {
          serializedExpand[key] = val
        }
      }
      result.expand = serializedExpand
    }

    return result
  }
}
