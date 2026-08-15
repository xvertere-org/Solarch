import { Router, Request, Response } from 'express'
import { createApiError } from '../utils/api_errors'
import { BaseApp } from '../core/base'
import { Collection } from '../core/collection'
import { syncRecordTableSchema, createRecordTable } from '../core/schema_sync'
import { requireSuperuserAuth } from './middlewares_auth'
import { validateIdentifier } from '../utils/sql_safe'

const COLLECTION_WRITABLE_FIELDS = new Set([
  'name', 'type', 'system', 'listRule', 'viewRule', 'createRule', 'updateRule',
  'deleteRule', 'fields', 'indexes', 'authOptions', 'viewOptions',
])

function pickCollectionFields(data: Record<string, any>): Record<string, any> {
  const picked: Record<string, any> = {}
  for (const key of Object.keys(data)) {
    if (!COLLECTION_WRITABLE_FIELDS.has(key)) {
      continue
    }
    picked[key] = data[key]
  }
  return picked
}

export function registerCollectionRoutes(app: BaseApp, router: Router): void {
  const collectionRouter = Router()

  // FIXED[H-1]: Added requireSuperuserAuth to collection list/detail endpoints
  collectionRouter.get('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collections = await app.findAllCollections()
      res.json({
        page: 1,
        perPage: collections.length,
        totalItems: collections.length,
        totalPages: 1,
        items: collections.map(c => c.toJSON()),
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.get('/:idOrName', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.idOrName)
      if (!collection) {
        return res.status(404).json(createApiError(404, 'NOT_FOUND', 'Collection not found.'))
      }
      res.json(collection.toJSON())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.post('/', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collection = new Collection(req.body)
      await app.save(collection)

      // Create record table using schema sync
      await createRecordTable(app, collection)

      res.status(201).json(collection.toJSON())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.patch('/:idOrName', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.idOrName)
      if (!collection) {
        return res.status(404).json(createApiError(404, 'NOT_FOUND', 'Collection not found.'))
      }

      const picked = pickCollectionFields(req.body)
      Object.assign(collection, picked)
      // FIXED[H-1]/[L-1]: Re-validate after Object.assign bypasses constructor validation
      validateIdentifier(collection.name, 'collection name')
      for (const field of collection.fields) {
        validateIdentifier(field.name, 'field name')
      }
      await app.save(collection)

      // Sync schema after update
      await syncRecordTableSchema(app, collection)

      res.json(collection.toJSON())
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.delete('/:idOrName', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collection = await app.findCollectionByNameOrId(req.params.idOrName)
      if (!collection) {
        return res.status(404).json(createApiError(404, 'NOT_FOUND', 'Collection not found.'))
      }
      await app.delete(collection)
      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.post('/import', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { collections } = req.body
      if (!Array.isArray(collections)) {
        return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Invalid request: collections must be an array.'))
      }
      const imported: string[] = []

      for (const colData of collections) {
        // FIXED[L-5]: Validate that each collection object has required fields
        if (typeof colData !== 'object' || !colData || !colData.name || typeof colData.name !== 'string') {
          return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', 'Each collection must have a valid "name" field.'))
        }
        if (colData.type && !['base', 'auth', 'view'].includes(colData.type)) {
          return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', `Invalid collection type: "${colData.type}". Must be base, auth, or view.`))
        }
        if (!Array.isArray(colData.fields)) {
          return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', `Collection "${colData.name}" must have a "fields" array.`))
        }
        // FIXED[L-2]: Validate individual field names to prevent SQL injection via DDL in import
        for (const field of colData.fields) {
          if (typeof field.name !== 'string') {
            return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', `Collection "${colData.name}" has a field without a valid name.`))
          }
          try {
            validateIdentifier(field.name, 'field name')
          } catch {
            return res.status(400).json(createApiError(400, 'VALIDATION_FAILED', `Collection "${colData.name}" has invalid field name: "${field.name}".`))
          }
        }
        const existing = await app.findCollectionByNameOrId(colData.name)
        if (existing) {
          Object.assign(existing, pickCollectionFields(colData))
          await app.save(existing)
          await syncRecordTableSchema(app, existing)
          imported.push(existing.id)
        } else {
          const collection = new Collection(colData)
          await app.save(collection)
          await createRecordTable(app, collection)
          imported.push(collection.id)
        }
      }

      res.json({ imported })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  collectionRouter.post('/export', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const collections = await app.findAllCollections()
      res.json(collections.map(c => c.toJSON()))
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json(createApiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    }
  })

  router.use('/api/collections', collectionRouter)
}
