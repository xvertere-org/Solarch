/**
 * Solarch CLI Ephemeral Auth Callback Server (Phase 2)
 *
 * Listens on 127.0.0.1:0 for OAuth / Dashboard authorization code callbacks.
 * Enforces PKCE, state validation, one-time consumption, and clean teardown.
 */

import * as http from 'http'
import * as crypto from 'crypto'
import { PKCEChallenge } from './types.js'

export interface CallbackResult {
  code: string
  state: string
}

export class AuthCallbackServer {
  private server: http.Server | null = null
  private port: number = 0
  private challenge: PKCEChallenge
  private timeoutTimer: NodeJS.Timeout | null = null
  private callbackResolver: ((result: CallbackResult) => void) | null = null
  private callbackRejecter: ((err: Error) => void) | null = null
  private isSettled = false

  constructor() {
    this.challenge = AuthCallbackServer.generatePKCE()
  }

  public getChallenge(): PKCEChallenge {
    return this.challenge
  }

  public getPort(): number {
    return this.port
  }

  public getRedirectUri(): string {
    return `http://127.0.0.1:${this.port}/auth/callback`
  }

  public static generatePKCE(): PKCEChallenge {
    const verifier = crypto.randomBytes(32).toString('base64url')
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url')
    const state = crypto.randomBytes(24).toString('hex')

    return { verifier, challenge, state }
  }

  /**
   * Starts listening on 127.0.0.1 on an available port.
   * Resolves immediately when the server is ready to accept connections.
   */
  public async listen(): Promise<number> {
    if (this.server && this.port > 0) {
      return this.port
    }

    return new Promise<number>((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res)
      })

      this.server.on('error', (err) => {
        if (!this.isSettled) {
          this.isSettled = true
          this.close()
          if (this.callbackRejecter) {
            this.callbackRejecter(err)
          }
        }
        reject(err)
      })

      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server?.address()
        if (address && typeof address === 'object') {
          this.port = address.port
          resolve(this.port)
        } else {
          reject(new Error('Failed to obtain server listening address.'))
        }
      })
    })
  }

  /**
   * Waits for the incoming callback request until timeout.
   */
  public async waitForCallback(timeoutMs: number = 120000): Promise<CallbackResult> {
    if (!this.server || this.port === 0) {
      await this.listen()
    }

    return new Promise<CallbackResult>((resolve, reject) => {
      this.callbackResolver = resolve
      this.callbackRejecter = reject

      this.timeoutTimer = setTimeout(() => {
        if (!this.isSettled) {
          this.isSettled = true
          this.close()
          reject(new Error('Authentication callback timed out after 2 minutes.'))
        }
      }, timeoutMs)
    })
  }

  /**
   * Convenience method to start server and wait for callback in one step.
   */
  public async start(timeoutMs: number = 120000): Promise<CallbackResult> {
    await this.listen()
    return this.waitForCallback(timeoutMs)
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${this.port}`)
      if (reqUrl.pathname !== '/auth/callback' && reqUrl.pathname !== '/callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
        return
      }

      const state = reqUrl.searchParams.get('state')
      const code = reqUrl.searchParams.get('code')
      const error = reqUrl.searchParams.get('error')
      const errorDescription = reqUrl.searchParams.get('error_description')

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px;">
              <h2 style="color: #e53e3e;">Authentication Failed</h2>
              <p>${errorDescription || error}</p>
              <p>You may return to your terminal.</p>
            </body>
          </html>
        `)
        if (!this.isSettled) {
          this.isSettled = true
          const reject = this.callbackRejecter
          this.close()
          if (reject) {
            reject(new Error(`Authentication failed: ${errorDescription || error}`))
          }
        }
        return
      }

      if (!state || state !== this.challenge.state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px;">
              <h2 style="color: #e53e3e;">Invalid State Parameter</h2>
              <p>Security validation failed. Please retry login from the terminal.</p>
            </body>
          </html>
        `)
        if (!this.isSettled) {
          this.isSettled = true
          const reject = this.callbackRejecter
          this.close()
          if (reject) {
            reject(new Error('State mismatch in authentication callback.'))
          }
        }
        return
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px;">
              <h2 style="color: #e53e3e;">Missing Authorization Code</h2>
            </body>
          </html>
        `)
        if (!this.isSettled) {
          this.isSettled = true
          const reject = this.callbackRejecter
          this.close()
          if (reject) {
            reject(new Error('No authorization code provided in callback.'))
          }
        }
        return
      }

      // Successful callback
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Solarch Authentication</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 1px solid #334155; }
              h1 { color: #38bdf8; font-size: 22px; margin-bottom: 12px; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Authentication Successful</h1>
              <p>You have successfully logged in to the Solarch Platform.<br/>You can close this tab and return to your terminal.</p>
            </div>
          </body>
        </html>
      `)

      if (!this.isSettled) {
        this.isSettled = true
        const resolve = this.callbackResolver
        this.close()
        if (resolve) {
          resolve({ code, state })
        }
      }
    } catch (err: any) {
      if (!this.isSettled) {
        this.isSettled = true
        const reject = this.callbackRejecter
        this.close()
        if (reject) {
          reject(err)
        }
      }
    }
  }

  public close(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
    if (this.server) {
      try {
        this.server.close()
      } catch {}
      this.server = null
    }
  }
}
