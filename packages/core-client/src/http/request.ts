/**
 * @solarch/core-client - HTTP Request Builder
 */

import { PROTOCOL_HEADER, PROTOCOL_VERSION } from '../contracts/protocol.js'
import type { FetchRequestInit } from '../contracts/interfaces.js'

export interface PrepareRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  signal?: any
  token?: string
  [key: string]: any
}

export function isFormData(body: any): boolean {
  return (
    body !== null &&
    typeof body === 'object' &&
    typeof body.append === 'function' &&
    typeof body.entries === 'function'
  )
}

export function prepareRequest(options: PrepareRequestOptions): {
  init: FetchRequestInit
  contentType: string | null
} {
  const method = (options.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {
    [PROTOCOL_HEADER]: PROTOCOL_VERSION,
    ...(options.headers || {}),
  }

  if (options.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  let finalBody = options.body
  let contentType: string | null = null

  if (finalBody !== undefined && finalBody !== null) {
    if (isFormData(finalBody)) {
      // Allow the runtime/browser to generate the multipart boundary automatically
      delete headers['Content-Type']
      delete headers['content-type']
    } else if (typeof finalBody === 'object' && !(finalBody instanceof ArrayBuffer)) {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
      finalBody = JSON.stringify(finalBody)
      contentType = 'application/json'
    }
  }

  const init: FetchRequestInit = {
    method,
    headers,
    body: finalBody,
    signal: options.signal,
  }

  return { init, contentType }
}
