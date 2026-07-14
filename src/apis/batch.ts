import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import { parsePagination } from '../utils/pagination'
import http from 'http'

interface BatchRequest {
  method: string
  url: string
  headers?: Record<string, string>
  body?: any
}

interface BatchResponse {
  status: number
  headers: Record<string, string>
  body: any
}

export function registerBatchRoutes(app: BaseApp, router: Router): void {
  router.post('/api/batch', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { requests } = req.body
      if (!Array.isArray(requests)) {
        return res.status(400).json({ code: 400, message: 'Invalid batch request.' })
      }

      const settings = app.settings()
      if (!settings.batch.enabled) {
        return res.status(403).json({ code: 403, message: 'Batch API is disabled.' })
      }

      if (requests.length > settings.batch.maxBatchSize) {
        return res.status(400).json({ code: 400, message: `Too many requests. Maximum is ${settings.batch.maxBatchSize}.` })
      }

      const MAX_BATCH_SIZE_CAP = 50
      if (requests.length > MAX_BATCH_SIZE_CAP) {
        return res.status(400).json({ code: 400, message: `Batch size exceeds hard limit of ${MAX_BATCH_SIZE_CAP}.` })
      }

      const MAX_SUB_REQUEST_BODY_SIZE = 1024 * 1024
      for (let i = 0; i < requests.length; i++) {
        if (requests[i].body && JSON.stringify(requests[i].body).length > MAX_SUB_REQUEST_BODY_SIZE) {
          return res.status(400).json({ code: 400, message: `Sub-request ${i} body exceeds maximum size of 1MB.` })
        }
      }

      const results: BatchResponse[] = []
      const db = app.db().getDataDB()

      db.exec('BEGIN TRANSACTION')

      try {
        for (const batchReq of requests) {
          const result = await processBatchRequest(app, req, batchReq)
          results.push(result)
        }
        db.exec('COMMIT')
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }

      res.json(results)
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}

async function processBatchRequest(app: BaseApp, originalReq: Request, batchReq: BatchRequest): Promise<BatchResponse> {
  const { method, url, headers, body } = batchReq

  const mockReq: any = {
    method: method.toUpperCase(),
    url,
    headers: { ...originalReq.headers, ...(headers || {}) },
    body: body || {},
    query: {},
    params: {},
    authContext: originalReq.authContext,
  }

  const urlParts = url.split('?')
  if (urlParts.length > 1) {
    const searchParams = new URLSearchParams(urlParts[1])
    for (const [key, value] of searchParams.entries()) {
      mockReq.query[key] = value
    }
  }

  let statusCode = 200
  let responseBody: any = {}
  let responseHeaders: Record<string, string> = {}

  const mockRes: any = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(data: any) {
      responseBody = data
      return this
    },
    send(data: any) {
      if (data) responseBody = data
      return this
    },
    setHeader(key: string, value: string) {
      responseHeaders[key] = value
      return this
    },
    end() {
      return this
    },
  }

  try {
    const path = urlParts[0]
    const handled = await routeBatchRequest(app, mockReq, mockRes, path)

    if (!handled) {
      statusCode = 404
      responseBody = { code: 404, message: 'Batch endpoint not found.' }
    }
  } catch (err: any) {
    statusCode = 500
    responseBody = { code: 500, message: 'Internal server error' }
  }

  return {
    status: statusCode,
    headers: responseHeaders,
    body: responseBody,
  }
}

async function routeBatchRequest(app: BaseApp, req: any, res: any, path: string): Promise<boolean> {
  const recordPattern = /^\/api\/collections\/([^\/]+)\/records(?:\/(.*))?$/
  const recordMatch = path.match(recordPattern)

  if (recordMatch) {
    const collectionIdOrName = recordMatch[1]
    const recordId = recordMatch[2]
    req.params = { collectionIdOrName, recordId }

    const collection = await app.findCollectionByNameOrId(collectionIdOrName)
    if (!collection) {
      res.status(404).json({ code: 404, message: 'Collection not found.' })
      return true
    }

    const { findRecordById, findAllRecords, deleteRecordById } = await import('../core/record_query.js')
    const { enrichRecord, enrichRecords, canAccessRecord } = await import('./record_helpers.js')
    const { RecordModel } = await import('../core/record.js')

    const requestInfo: any = {
      auth: req.authContext?.record ?? null,
      isAdmin: req.authContext?.isAdmin ?? false,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      data: req.body,
      context: 'list',
    }

    switch (req.method) {
      case 'GET': {
        if (recordId) {
          const record = await findRecordById(app, collectionIdOrName, recordId)
          if (!record) {
            res.status(404).json({ code: 404, message: 'Record not found.' })
            return true
          }
          requestInfo.context = 'view'
          if (collection.viewRule === null) {
            res.status(404).json({ code: 404, message: 'Record not found.' })
            return true
          }
          if (collection.viewRule !== '') {
            const accessible = await canAccessRecord(app, record, collection, collection.viewRule, requestInfo)
            if (!accessible) {
              res.status(404).json({ code: 404, message: 'Record not found.' })
              return true
            }
          }
          const enriched = await enrichRecord(app, collection, record, { requestInfo })
          res.json(enriched.toJSON())
        } else {
          requestInfo.context = 'list'
          // FIXED[N-1]: Enforce pagination bounds via shared helper
          const { page, perPage } = parsePagination(req.query)
          const filter = req.query.filter
          const sort = req.query.sort
          const expand = req.query.expand ? req.query.expand.split(',') : undefined
          const fields = req.query.fields ? req.query.fields.split(',') : undefined

          const result = await findAllRecords(app, collectionIdOrName, { filter, sort, page, perPage })
          let items = result.items

          if (collection.listRule === null) {
            items = []
          } else if (collection.listRule !== '') {
            const accessible = []
            for (const item of items) {
              if (await canAccessRecord(app, item, collection, collection.listRule, requestInfo)) {
                accessible.push(item)
              }
            }
            items = accessible
          }

          const enriched = await enrichRecords(app, collection, items, { expands: expand, fields, requestInfo })
          res.json({
            page: result.page,
            perPage: result.perPage,
            totalItems: result.totalItems,
            totalPages: result.totalPages,
            items: enriched.map((r: any) => r.toJSON()),
          })
        }
        return true
      }

      case 'POST': {
        requestInfo.context = 'create'
        if (collection.createRule === null) {
          res.status(403).json({ code: 403, message: 'Access denied.' })
          return true
        }
        if (collection.createRule !== '') {
          const dummyRecord = new RecordModel(collection.id, collection.name, req.body)
          const accessible = await canAccessRecord(app, dummyRecord, collection, collection.createRule, requestInfo)
          if (!accessible) {
            res.status(403).json({ code: 403, message: 'Access denied.' })
            return true
          }
        }
        const { validateAndCreateRecord } = await import('../core/record_upsert.js')
        const { record, errors } = await validateAndCreateRecord(app, collection, req.body)
        if (errors.length > 0) {
          res.status(400).json({ code: 400, message: 'Validation failed.', data: errors })
          return true
        }
        await app.save(record)
        const enriched = await enrichRecord(app, collection, record, { requestInfo })
        res.status(201).json(enriched.toJSON())
        return true
      }

      case 'PATCH': {
        if (!recordId) {
          res.status(400).json({ code: 400, message: 'Record ID required.' })
          return true
        }
        const record = await findRecordById(app, collectionIdOrName, recordId)
        if (!record) {
          res.status(404).json({ code: 404, message: 'Record not found.' })
          return true
        }
        requestInfo.context = 'update'
        if (collection.updateRule === null) {
          res.status(403).json({ code: 403, message: 'Access denied.' })
          return true
        }
        if (collection.updateRule !== '') {
          const accessible = await canAccessRecord(app, record, collection, collection.updateRule, requestInfo)
          if (!accessible) {
            res.status(403).json({ code: 403, message: 'Access denied.' })
            return true
          }
        }
        const { validateAndUpdateRecord } = await import('../core/record_upsert.js')
        const { record: updatedRecord, errors } = await validateAndUpdateRecord(app, collection, record, req.body)
        if (errors.length > 0) {
          res.status(400).json({ code: 400, message: 'Validation failed.', data: errors })
          return true
        }
        await app.save(updatedRecord)
        const enriched = await enrichRecord(app, collection, updatedRecord, { requestInfo })
        res.json(enriched.toJSON())
        return true
      }

      case 'DELETE': {
        if (!recordId) {
          res.status(400).json({ code: 400, message: 'Record ID required.' })
          return true
        }
        const record = await findRecordById(app, collectionIdOrName, recordId)
        if (!record) {
          res.status(404).json({ code: 404, message: 'Record not found.' })
          return true
        }
        requestInfo.context = 'delete'
        if (collection.deleteRule === null) {
          res.status(403).json({ code: 403, message: 'Access denied.' })
          return true
        }
        if (collection.deleteRule !== '') {
          const accessible = await canAccessRecord(app, record, collection, collection.deleteRule, requestInfo)
          if (!accessible) {
            res.status(403).json({ code: 403, message: 'Access denied.' })
            return true
          }
        }
        await app.delete(record)
        res.status(204).send()
        return true
      }
    }
  }

  return false
}
