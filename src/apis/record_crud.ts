import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { findAllRecords, findRecordById, findFirstRecordByFilter, findRecordsByFilter, countRecords, vectorSearch } from '../core/record_query'
import { enrichRecord, enrichRecords, canAccessRecord, checkCollectionAccess } from './record_helpers'
import { RequestInfo } from '../core/record_field_resolver'
import { validateAndCreateRecord, validateAndUpdateRecord } from '../core/record_upsert'
import { broadcastRecordEvent } from './realtime'
import { parsePagination } from '../utils/pagination'

export function registerRecordCRUDRoutes(app: BaseApp, router: Router): void {
  const recordRouter = Router({ mergeParams: true })

  recordRouter.get('/', async (req: Request, res: Response) => {
    try {
      const collectionIdOrName = req.params.collectionIdOrName
      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const requestInfo = buildRequestInfo(req)

      requestInfo.context = 'list'

      // FIXED[N-1]: Enforce pagination bounds via shared helper
      const { page, perPage } = parsePagination(req.query)
      const filter = req.query.filter as string
      const sort = req.query.sort as string
      const expand = req.query.expand ? (req.query.expand as string).split(',') : undefined
      const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined
      const skipTotal = req.query.skipTotal === '1' || req.query.skipTotal === 'true'

      const result = await findAllRecords(app, collectionIdOrName, {
        filter,
        sort,
        page,
        perPage,
        skipTotal,
      })

      let items = result.items

      if (collection.listRule === null) {
        items = []
      } else if (collection.listRule !== '') {
        const accessible: PBRecord[] = []
        for (const item of items) {
          if (await canAccessRecord(app, item, collection, collection.listRule, requestInfo)) {
            accessible.push(item)
          }
        }
        items = accessible
      }

      const enriched = await enrichRecords(app, collection, items, {
        expands: expand,
        fields,
        requestInfo,
      })

      res.json({
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        items: enriched.map(r => r.toJSON()),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  recordRouter.post('/vector-search', async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const { field, vector, limit, minSimilarity } = req.body
      if (!field || !Array.isArray(vector)) {
        return res.status(400).json({ code: 400, message: 'Missing required fields: field, vector' })
      }

      const requestInfo = buildRequestInfo(req)

      const results = await vectorSearch(
        app,
        req.params.collectionIdOrName,
        field,
        vector,
        limit ? parseInt(limit, 10) : 10,
        minSimilarity !== undefined ? parseFloat(minSimilarity) : undefined
      )

      let accessible = results
      if (collection.listRule === null) {
        accessible = []
      } else if (collection.listRule !== '') {
        accessible = []
        for (const item of results) {
          if (await canAccessRecord(app, item.record, collection, collection.listRule, requestInfo)) {
            accessible.push(item)
          }
        }
      }

      const enriched = await enrichRecords(
        app,
        collection,
        accessible.map(r => r.record),
        { requestInfo }
      )

      res.json({
        items: enriched.map((record, i) => ({
          ...record.toJSON(),
          similarity: accessible[i].similarity,
        })),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  recordRouter.get('/:recordId', async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const record = await findRecordById(app, req.params.collectionIdOrName, req.params.recordId)
      if (!record) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const requestInfo = buildRequestInfo(req)
      requestInfo.context = 'view'

      if (collection.viewRule === null) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }
      if (collection.viewRule !== '') {
        const accessible = await canAccessRecord(app, record, collection, collection.viewRule, requestInfo)
        if (!accessible) {
          return res.status(404).json({ code: 404, message: 'Record not found.' })
        }
      }

      const expand = req.query.expand ? (req.query.expand as string).split(',') : undefined
      const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined

      const enriched = await enrichRecord(app, collection, record, {
        expands: expand,
        fields,
        requestInfo,
      })

      res.json(enriched.toJSON())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  recordRouter.post('/', async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const requestInfo = buildRequestInfo(req)
      requestInfo.context = 'create'

      // Enforce createRule before validation
      if (collection.createRule === null) {
        return res.status(403).json({ code: 403, message: 'Access denied.' })
      }

      const { record, errors } = await validateAndCreateRecord(app, collection, req.body)
      if (errors.length > 0) {
        return res.status(400).json({ code: 400, message: 'Validation failed.', data: errors })
      }

      if (collection.createRule !== '') {
        const accessible = await canAccessRecord(app, record, collection, collection.createRule, requestInfo)
        if (!accessible) {
          return res.status(403).json({ code: 403, message: 'Access denied.' })
        }
      }

      await app.save(record)

      const enriched = await enrichRecord(app, collection, record, { requestInfo })

      // Broadcast realtime event
      broadcastRecordEvent('create', collection.id, enriched.toJSON())

      const response = enriched.toJSON()
      if (collection.isAuth()) {
        const token = app.generateJWT(
          { id: record.id, type: 'auth', collectionId: collection.id },
          app.getJwtSecret(),
          '720h'
        )
        res.status(201).json({ token, record: response })
      } else {
        res.status(201).json(response)
      }
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ code: 400, message: 'Validation failed.', errors: [{ field: 'email', message: 'Value must be unique.' }] })
      }
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  recordRouter.patch('/:recordId', async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const existingRecord = await findRecordById(app, req.params.collectionIdOrName, req.params.recordId)
      if (!existingRecord) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const requestInfo = buildRequestInfo(req)
      requestInfo.context = 'update'

      if (collection.updateRule === null) {
        return res.status(403).json({ code: 403, message: 'Access denied.' })
      }
      if (collection.updateRule !== '') {
        const accessible = await canAccessRecord(app, existingRecord, collection, collection.updateRule, requestInfo)
        if (!accessible) {
          return res.status(403).json({ code: 403, message: 'Access denied.' })
        }
      }

      const { record, errors } = await validateAndUpdateRecord(app, collection, existingRecord, req.body)
      if (errors.length > 0) {
        return res.status(400).json({ code: 400, message: 'Validation failed.', data: errors })
      }

      await app.save(record)

      const enriched = await enrichRecord(app, collection, record, { requestInfo })

      // Broadcast realtime event
      broadcastRecordEvent('update', collection.id, enriched.toJSON())

      res.json(enriched.toJSON())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  recordRouter.delete('/:recordId', async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const record = await findRecordById(app, req.params.collectionIdOrName, req.params.recordId)
      if (!record) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const requestInfo = buildRequestInfo(req)
      requestInfo.context = 'delete'

      if (collection.deleteRule === null) {
        return res.status(403).json({ code: 403, message: 'Access denied.' })
      }
      if (collection.deleteRule !== '') {
        const accessible = await canAccessRecord(app, record, collection, collection.deleteRule, requestInfo)
        if (!accessible) {
          return res.status(403).json({ code: 403, message: 'Access denied.' })
        }
      }

      await app.delete(record)

      // Broadcast realtime event
      broadcastRecordEvent('delete', collection.id, { id: record.id })

      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.use('/api/collections/:collectionIdOrName/records', recordRouter)
}

function buildRequestInfo(req: Request): RequestInfo {
  return {
    auth: req.authContext?.record ?? null,
    isAdmin: req.authContext?.isAdmin ?? false,
    method: req.method,
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, string>,
    body: req.body,
    data: req.body,
    context: 'list',
  }
}
