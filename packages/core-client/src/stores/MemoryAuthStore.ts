/**
 * @solarch/core-client - MemoryAuthStore (In-Memory Implementation)
 */

import type { AuthModel } from '../contracts/types.js'
import { BaseAuthStore } from './BaseAuthStore.js'

export class MemoryAuthStore extends BaseAuthStore {
  constructor(initialToken: string = '', initialModel: AuthModel = null) {
    super()
    this.token = initialToken
    this.model = initialModel
  }
}
