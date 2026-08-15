export interface BaseModelData {
  id: string
  created: string
  updated: string
}

import { randomBytes } from 'crypto'

export abstract class BaseModel {
  id: string
  created: Date
  updated: Date
  private _isNew: boolean

  constructor(data?: Partial<BaseModelData>) {
    this.id = data?.id ?? generateId()
    this.created = data?.created ? new Date(data.created) : new Date()
    this.updated = data?.updated ? new Date(data.updated) : new Date()
    this._isNew = !data?.id || (!data?.created && !data?.updated)
  }

  isNew(): boolean {
    return this._isNew
  }

  markAsNew(): void {
    this.id = `new_${generateId()}`
    this._isNew = true
  }

  markAsNotNew(): void {
    this._isNew = false
    if (this.id.startsWith('new_')) {
      this.id = this.id.slice(4)
    }
  }

  abstract tableName(): string

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      created: this.created.toISOString(),
      updated: this.updated.toISOString(),
    }
  }
}

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(4).toString('hex')
  return `${timestamp}${random}`
}
