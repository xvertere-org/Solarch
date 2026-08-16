/**
 * @solarch/core-client - HTTP Response Parser and Abort Handler
 */

import { ClientResponseError, parseApiError } from '../contracts/errors.js'
import type { FetchResponseLike } from '../contracts/interfaces.js'

export async function parseHttpResponse<T = any>(res: FetchResponseLike): Promise<T> {
  const isNoBody = res.status === 204 || res.status === 205 || res.status === 304
  const contentType = (res.headers && typeof res.headers.get === 'function'
    ? res.headers.get('content-type') || ''
    : ''
  ).toLowerCase()

  let data: any = null

  if (!isNoBody) {
    if (contentType.includes('application/json')) {
      try {
        data = await res.json()
      } catch (err: any) {
        if (err && err.name === 'AbortError') {
          throw ClientResponseError.fromAbort(err)
        }
        data = null
      }
    } else if (contentType.includes('text/')) {
      try {
        data = await res.text()
      } catch (err: any) {
        if (err && err.name === 'AbortError') {
          throw ClientResponseError.fromAbort(err)
        }
        data = null
      }
    } else {
      try {
        if (typeof res.blob === 'function') {
          data = await res.blob()
        } else if (typeof res.text === 'function') {
          data = await res.text()
        }
      } catch (err: any) {
        if (err && err.name === 'AbortError') {
          throw ClientResponseError.fromAbort(err)
        }
        data = null
      }
    }

  }

  if (res.status >= 400) {
    throw parseApiError(res, data)
  }

  return data as T
}
