/**
 * @solarch/core-client - AdminService (Superuser Authentication & Account Management)
 */

import type { AdminAuthResponse, RecordOptions } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class AdminService {
  constructor(readonly client: HttpClient) {}

  protected get basePath(): string {
    return '/api/admins'
  }

  /**
   * Authenticates a superuser with email/identity and password.
   * On success, saves the resulting JWT and AdminModel into the client's AuthStore.
   */
  async authWithPassword(
    identity: string,
    password: string,
    options: RecordOptions = {}
  ): Promise<AdminAuthResponse> {
    const res = await this.client.post<AdminAuthResponse>(
      `${this.basePath}/auth-with-password`,
      {
        body: { identity, password },
        query: options,
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.admin)
    }
    return res
  }

  /**
   * Refreshes the currently authenticated admin session.
   * On success, updates the token in the client's AuthStore.
   */
  async authRefresh(options: RecordOptions = {}): Promise<AdminAuthResponse> {
    const res = await this.client.post<AdminAuthResponse>(
      `${this.basePath}/refresh`,
      {
        query: options,
      }
    )
    if (res && res.token) {
      this.client.authStore.save(res.token, res.admin)
    }
    return res
  }

  /**
   * Sends an admin password reset request to the specified email.
   */
  async requestPasswordReset(
    email: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(`${this.basePath}/request-password-reset`, {
      body: { email },
      query: options,
    })
    return true
  }

  /**
   * Confirms a password reset using the token received via email.
   */
  async confirmPasswordReset(
    token: string,
    password: string,
    passwordConfirm: string,
    options: RecordOptions = {}
  ): Promise<boolean> {
    await this.client.post(`${this.basePath}/confirm-password-reset`, {
      body: { token, password, passwordConfirm },
      query: options,
    })
    return true
  }
}
