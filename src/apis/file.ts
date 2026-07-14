import { Router, Request, Response } from 'express'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { canAccessRecord } from './record_helpers'
import { RequestInfo } from '../core/record_field_resolver'
import { requireSuperuserAuth } from './middlewares_auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { createHash } from 'crypto'
import { Readable } from 'stream'
import { quoteIdentifier } from '../utils/sql_safe'

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024


const MAGIC_BYTES: Record<string, string[]> = {
  'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffee', 'ffd8ffdb'],
  'image/png': ['89504e47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'],
  'application/pdf': ['25504446'],
  'application/zip': ['504b0304', '504b0506', '504b0708'],
}

function detectMimeType(buffer: Buffer): string {
  const hex = buffer.toString('hex', 0, Math.min(buffer.length, 12)).toLowerCase()
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (hex.startsWith(sig.toLowerCase())) return mime
    }
  }
  const textSample = buffer.toString('utf8', 0, Math.min(buffer.length, 512))
  if (/^[\x20-\x7E\r\n\t]+$/.test(textSample)) return 'text/plain'
  return 'application/octet-stream'
}

function assertPathSafe(targetPath: string, baseDir: string): void {
  const resolved = path.resolve(targetPath)
  const base = path.resolve(baseDir)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Path traversal detected')
  }
}

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.csv', '.json', '.zip']
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`File extension not allowed: ${ext}`))
  }
  cb(null, true)
}

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
})

function generateFileToken(app: BaseApp, collectionId: string, recordId: string, filename: string): string {
  return app.generateJWT(
    { type: 'file', collectionId, recordId, filename },
    app.getJwtSecret(),
    '1h'
  )
}

function verifyFileToken(app: BaseApp, token: string): { collectionId: string; recordId: string; filename: string } | null {
  try {
    const payload = app.parseJWT(token, app.getJwtSecret())
    if (!payload || payload.type !== 'file') return null
    return { collectionId: payload.collectionId, recordId: payload.recordId, filename: payload.filename }
  } catch {
    return null
  }
}

export function registerFileRoutes(app: BaseApp, router: Router): void {
  router.post('/api/files/token', async (req: Request, res: Response) => {
    try {
      const { collection: collectionIdOrName, recordId, filename } = req.body
      if (!collectionIdOrName || !recordId || !filename) {
        return res.status(400).json({ code: 400, message: 'Missing collection, recordId, or filename.' })
      }

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(recordId) as any
      if (!row) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const record = new PBRecord(collection.id, collection.name, row)

      const requestInfo: RequestInfo = {
        auth: req.authContext?.record ?? null,
        isAdmin: req.authContext?.isAdmin ?? false,
        method: req.method,
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, string>,
        body: req.body,
        data: req.body,
        context: 'view',
      }

      if (collection.viewRule === null) {
        return res.status(403).json({ code: 403, message: 'File access denied.' })
      }
      if (collection.viewRule !== '') {
        const accessible = await canAccessRecord(app, record, collection, collection.viewRule, requestInfo)
        if (!accessible) {
          return res.status(403).json({ code: 403, message: 'File access denied.' })
        }
      }

      const token = generateFileToken(app, collection.id, recordId, filename)
      res.json({ token })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/collections/:collectionIdOrName/records/:recordId/files', requireSuperuserAuth(app), upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      const { collectionIdOrName, recordId } = req.params
      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(recordId) as any
      if (!row) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        return res.status(400).json({ code: 400, message: 'No files uploaded.' })
      }

      const fsys = app.getFilesystem()
      const storageBase = path.join(app.dataDir, 'storage', collection.name, recordId)
      await fsPromises.mkdir(storageBase, { recursive: true })

      const savedFiles: string[] = []
      const thumbsGenerated: string[] = []

      for (const file of files) {
        const ext = path.extname(file.originalname)
        const baseName = path.basename(file.originalname, ext)
        const safeName = `${baseName}${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_')
        const safeCollection = collection.name.replace(/[^a-zA-Z0-9_-]/g, '_')
        const destPath = path.join(storageBase, safeName)
        const storageKey = path.join(safeCollection, recordId, safeName)

        assertPathSafe(destPath, storageBase)

        const fileContent = await fsPromises.readFile(file.path)
        const detectedMime = detectMimeType(fileContent)
        if (!ALLOWED_FILE_TYPES.includes(detectedMime) && detectedMime !== 'application/octet-stream') {
          await fsPromises.unlink(file.path)
          return res.status(400).json({ code: 400, message: `File content type not allowed: ${detectedMime}` })
        }
        await fsys.putFile(storageKey, fileContent)
        await fsPromises.unlink(file.path)
        savedFiles.push(safeName)
        if (isImageFile(safeName)) {
          const thumbs = await generateThumbnails(destPath, storageBase, baseName, ext, app)
          thumbsGenerated.push(...thumbs)
        }
      }

      const fieldName = req.query.field as string || 'files'
      const fieldDef = collection.fields.find(f => f.name === fieldName)
      if (!fieldDef || fieldDef.type !== 'file') {
        return res.status(400).json({ code: 400, message: `Invalid field: "${fieldName}" is not a file field.` })
      }
      const record = new PBRecord(collection.id, collection.name, row)
      const existingFiles = record.get(fieldName) || []
      const allFiles = Array.isArray(existingFiles) ? [...existingFiles, ...savedFiles] : savedFiles
      record.set(fieldName, allFiles)
      await app.save(record)

      res.status(200).json({
        files: savedFiles,
        thumbs: thumbsGenerated,
      })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.get('/api/files/:collectionIdOrName/:recordId/:filename', async (req: Request, res: Response) => {
    try {
      const { collectionIdOrName, recordId, filename } = req.params
      const thumb = req.query.thumb as string
      const download = req.query.download === '1'
      const fileToken = req.query.token as string

      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(recordId) as any
      if (!row) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const record = new PBRecord(collection.id, collection.name, row)

      if (fileToken) {
        const tokenPayload = verifyFileToken(app, fileToken)
        if (!tokenPayload || tokenPayload.collectionId !== collection.id || tokenPayload.recordId !== recordId || tokenPayload.filename !== filename) {
          return res.status(403).json({ code: 403, message: 'Invalid or expired file token.' })
        }
      } else {
        const requestInfo: RequestInfo = {
          auth: req.authContext?.record ?? null,
          isAdmin: req.authContext?.isAdmin ?? false,
          method: req.method,
          headers: req.headers as Record<string, string>,
          query: req.query as Record<string, string>,
          body: req.body,
          data: req.body,
          context: 'view',
        }

        if (collection.viewRule === null) {
          return res.status(404).json({ code: 404, message: 'File not found.' })
        }
        if (collection.viewRule !== '') {
          const accessible = await canAccessRecord(app, record, collection, collection.viewRule, requestInfo)
          if (!accessible) {
            return res.status(404).json({ code: 404, message: 'File not found.' })
          }
        }
      }

      const fsys = app.getFilesystem()
      const isS3 = app.settings().s3?.enabled

      if (isS3) {
        const storageKey = thumb
          ? path.join(collection.name, recordId, `${path.basename(filename, path.extname(filename))}_${thumb}${path.extname(filename)}`)
          : path.join(collection.name, recordId, filename)

        const exists = await fsys.fileExists(storageKey)
        if (!exists) {
          return res.status(404).json({ code: 404, message: 'File not found.' })
        }

        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }

        const stream = await fsys.getFile(storageKey) as Readable
        stream.pipe(res)
      } else {
        const storageBase = path.join(app.dataDir, 'storage', collection.name, recordId)
        let filePath: string
        if (thumb) {
          filePath = path.join(storageBase, `${path.basename(filename, path.extname(filename))}_${thumb}${path.extname(filename)}`)
        } else {
          filePath = path.join(storageBase, filename)
        }

        assertPathSafe(filePath, storageBase)

        let exists: boolean
        try {
          await fsPromises.access(filePath)
          exists = true
        } catch {
          exists = false
        }
        if (!exists) {
          return res.status(404).json({ code: 404, message: 'File not found.' })
        }

        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        }

        res.sendFile(path.resolve(filePath))
      }
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  // File delete endpoint
  router.delete('/api/collections/:collectionIdOrName/records/:recordId/files/:filename', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { collectionIdOrName, recordId, filename } = req.params
      const collection = await app.findCollectionByNameOrId(collectionIdOrName)
      if (!collection) {
        return res.status(404).json({ code: 404, message: 'Collection not found.' })
      }

      const db = app.db().getDataDB()
      const row = db.prepare(`SELECT * FROM ${quoteIdentifier(`_r_${collection.id}`)} WHERE id = ?`).get(recordId) as any
      if (!row) {
        return res.status(404).json({ code: 404, message: 'Record not found.' })
      }

      const fsys = app.getFilesystem()
      const storageBase = path.join(app.dataDir, 'storage', collection.name, recordId)
      const filePath = path.join(storageBase, filename)

      assertPathSafe(filePath, storageBase)

      try {
        await fsPromises.unlink(filePath)
      } catch {
      }
      await fsys.deleteFile(path.join(collection.name, recordId, filename)).catch(() => { })

      const baseName = path.basename(filename, path.extname(filename))
      const ext = path.extname(filename)
      try {
        const entries = await fsPromises.readdir(storageBase)
        const thumbs = entries.filter(f => f.startsWith(`${baseName}_thumb`))
        for (const thumb of thumbs) {
          await fsPromises.unlink(path.join(storageBase, thumb)).catch(() => { })
          await fsys.deleteFile(path.join(collection.name, recordId, thumb)).catch(() => { })
        }
      } catch {
      }

      const record = new PBRecord(collection.id, collection.name, row)
      const fieldName = req.query.field as string || 'files'
      const existingFiles = record.get(fieldName) || []
      if (Array.isArray(existingFiles)) {
        record.set(fieldName, existingFiles.filter((f: string) => f !== filename))
        await app.save(record)
      }

      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)
}

async function generateThumbnails(
  sourcePath: string,
  storageBase: string,
  baseName: string,
  ext: string,
  app: BaseApp
): Promise<string[]> {
  const thumbs: string[] = []
  const sizes = [
    { suffix: 'thumb_100x100', width: 100, height: 100 },
    { suffix: 'thumb_300x300', width: 300, height: 300 },
    { suffix: 'thumb_500x500', width: 500, height: 500 },
  ]

  try {
    let sharp: any
    try {
      sharp = require('sharp')
    } catch {
      app.logger().warn('sharp not installed, skipping thumbnail generation')
      return thumbs
    }

    for (const size of sizes) {
      const thumbPath = path.join(storageBase, `${baseName}_${size.suffix}${ext}`)
      await sharp(sourcePath)
        .resize(size.width, size.height, { fit: 'cover', withoutEnlargement: true })
        .toFile(thumbPath)
      thumbs.push(`${baseName}_${size.suffix}${ext}`)
    }
  } catch (err: any) {
    app.logger().error('Thumbnail generation failed', err.message)
  }

  return thumbs
}
