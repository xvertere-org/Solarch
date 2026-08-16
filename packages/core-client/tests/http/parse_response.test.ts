import { describe, it, expect, vi } from 'vitest'
import { parseHttpResponse } from '../../src/http/response.js'
import { ClientResponseError } from '../../src/contracts/errors.js'

function mockResponse(status: number, contentType: string, body: any, options: any = {}) {
  return {
    status,
    statusText: options.statusText || (status === 200 ? 'OK' : 'Error'),
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: typeof body === 'object' && contentType.includes('json')
      ? (async () => body)
      : (async () => { throw new Error('Not JSON') }),
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
    blob: options.blob || (async () => new Blob([typeof body === 'string' ? body : ''])),
  }
}

describe('parseHttpResponse Unit Tests', () => {
  describe('No-body responses (204, 205, 304)', () => {
    it('returns null for 204 No Content responses', async () => {
      const res = mockResponse(204, '', null)
      const result = await parseHttpResponse(res as any)
      expect(result).toBeNull()
    })

    it('returns null for 205 Reset Content responses without throwing', async () => {
      const res = {
        status: 205,
        statusText: 'Reset Content',
        ok: true,
        headers: { get: () => null },
        json: async () => { throw new Error('No body') },
        text: async () => '',
      }
      const result = await parseHttpResponse(res as any)
      expect(result).toBeNull()
    })

    it('returns null for 304 Not Modified responses without throwing', async () => {
      const res = {
        status: 304,
        statusText: 'Not Modified',
        ok: true,
        headers: { get: () => null },
        json: async () => { throw new Error('No body') },
        text: async () => '',
      }
      const result = await parseHttpResponse(res as any)
      expect(result).toBeNull()
    })
  })

  describe('JSON responses', () => {
    it('parses JSON body on 200', async () => {
      const data = { id: 'rec_1', title: 'Hello' }
      const res = mockResponse(200, 'application/json', data)
      const result = await parseHttpResponse(res as any)
      expect(result).toEqual(data)
    })

    it('handles application/json; charset=utf-8', async () => {
      const data = { id: 'rec_1' }
      const res = mockResponse(200, 'application/json; charset=utf-8', data)
      const result = await parseHttpResponse(res as any)
      expect(result).toEqual(data)
    })

    it('returns null data on JSON parse failure (non-abort)', async () => {
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: { get: () => 'application/json' },
        json: async () => { throw new Error('Invalid JSON') },
        text: async () => 'not json',
      }
      const result = await parseHttpResponse(res as any)
      expect(result).toBeNull()
    })
  })

  describe('text responses', () => {
    it('returns raw text for text/ content types', async () => {
      const res = mockResponse(200, 'text/plain', 'Hello World')
      const result = await parseHttpResponse(res as any)
      expect(result).toBe('Hello World')
    })

    it('handles text/html content type', async () => {
      const res = mockResponse(200, 'text/html', '<h1>Hello</h1>')
      const result = await parseHttpResponse(res as any)
      expect(result).toBe('<h1>Hello</h1>')
    })
  })

  describe('blob fallback', () => {
    it('reads blob for unknown content types when blob() is available', async () => {
      const fakeBlob = { size: 10, type: 'image/png' }
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: { get: () => 'image/png' },
        blob: async () => fakeBlob,
        text: async () => '[binary]',
      }
      const result = await parseHttpResponse(res as any)
      expect(result).toBe(fakeBlob)
    })

    it('falls back to text() when blob() is not available', async () => {
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: { get: () => 'application/octet-stream' },
        text: async () => 'binary-as-text',
        // no blob method
      }
      const result = await parseHttpResponse(res as any)
      expect(result).toBe('binary-as-text')
    })
  })

  describe('error responses (status >= 400)', () => {
    it('throws ClientResponseError on 400', async () => {
      const errBody = { code: 400, status: 'VALIDATION_FAILED', message: 'Bad input' }
      const res = mockResponse(400, 'application/json', errBody, { statusText: 'Bad Request' })
      await expect(parseHttpResponse(res as any)).rejects.toThrow(ClientResponseError)
    })

    it('throws ClientResponseError on 404', async () => {
      const errBody = { code: 404, status: 'NOT_FOUND', message: 'Not found' }
      const res = mockResponse(404, 'application/json', errBody, { statusText: 'Not Found' })
      try {
        await parseHttpResponse(res as any)
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(404)
      }
    })

    it('throws ClientResponseError on 500 with non-JSON body', async () => {
      const res = {
        status: 500, statusText: 'Internal Server Error', ok: false,
        headers: { get: () => 'text/html' },
        text: async () => '<html>500 Error</html>',
      }
      try {
        await parseHttpResponse(res as any)
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.statusCode).toBe(500)
      }
    })
  })

  describe('AbortError handling', () => {
    it('re-throws AbortError from json() as ClientResponseError with isAbort', async () => {
      const abortErr = new Error('The operation was aborted')
      abortErr.name = 'AbortError'
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: { get: () => 'application/json' },
        json: async () => { throw abortErr },
      }
      try {
        await parseHttpResponse(res as any)
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.isAbort).toBe(true)
      }
    })

    it('re-throws AbortError from text() as ClientResponseError with isAbort', async () => {
      const abortErr = new Error('Aborted')
      abortErr.name = 'AbortError'
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: { get: () => 'text/plain' },
        text: async () => { throw abortErr },
      }
      try {
        await parseHttpResponse(res as any)
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ClientResponseError)
        expect(err.isAbort).toBe(true)
      }
    })
  })

  describe('edge cases', () => {
    it('handles missing headers.get gracefully', async () => {
      const res = {
        status: 200, statusText: 'OK', ok: true,
        headers: null,
        text: async () => 'fallback',
        blob: async () => 'fallback-blob',
      }
      const result = await parseHttpResponse(res as any)
      // With no content-type and no blob, falls to blob/text branch
      expect(result).toBeDefined()
    })
  })
})
