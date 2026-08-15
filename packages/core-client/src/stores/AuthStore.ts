/**
 * @solarch/core-client - AuthStore Interface
 */

import type { AuthModel } from '../contracts/types.js'

export type AuthStoreSubscriber = (token: string, model: AuthModel) => void

export interface AuthStore {
  /**
   * Returns the current authentication JWT token.
   */
  getToken(): string

  /**
   * Returns the authenticated model (RecordModel | AdminModel | null).
   */
  getModel(): AuthModel

  /**
   * Checks whether the store currently holds a valid, unexpired token.
   */
  isValid(): boolean

  /**
   * Saves the token and authenticated model to the store and notifies subscribers.
   */
  save(token: string, model: AuthModel): void

  /**
   * Clears the authentication state and notifies subscribers.
   */
  clear(): void

  /**
   * Subscribes to changes in authentication state.
   * Returns an unsubscribe function.
   */
  subscribe(callback: AuthStoreSubscriber): () => void
}
