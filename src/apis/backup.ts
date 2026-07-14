import { Router, Request, Response } from 'express'
import multer from 'multer'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { createStreamingBackup, restoreStreamingBackup, isBackupInProgress, BackupAlreadyRunningError } from './backup_utils'

const BACKUP_FILE_SIZE_LIMIT = 1024 * 1024 * 1024

function checkpointWalIfPossible(app: BaseApp): void {
  try {
    app.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
    app.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

export function registerBackupRoutes(app: BaseApp, router: Router): void {
  const backupDir = (() => {
    const dir = path.join(app.dataDir, 'backups')
    fs.mkdirSync(dir, { recursive: true })
    return dir
  })()

  router.get('/api/backups', requireSuperuserAuth(app), async (_req: Request, res: Response) => {
    try {
      if (!await pathExists(backupDir)) {
        return res.json([])
      }

      const entries = await fsPromises.readdir(backupDir)
      const zipFiles = entries.filter(f => f.endsWith('.zip'))
      const files = await Promise.all(zipFiles.map(async (file: string) => {
        const stat = await fsPromises.stat(path.join(backupDir, file))
        return {
          key: file,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        }
      }))
      files.sort((a: any, b: any) => b.modified.localeCompare(a.modified))

      res.json(files)
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/backups', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const { name } = req.body
      const sanitized = name
        ? name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\./g, '_')
        : `backup_${Date.now()}`
      const backupName = sanitized.endsWith('.zip') ? sanitized : `${sanitized}.zip`
      const backupPath = path.join(backupDir, backupName)

      if (await pathExists(backupPath)) {
        return res.status(409).json({ code: 409, message: `Backup "${backupName}" already exists` })
      }

      await createStreamingBackup(app, backupPath)

      try {
        await app.onBackupCreate.trigger({ app, name: backupName })
      } catch {
      }

      const stat = await fsPromises.stat(backupPath)
      res.json({
        code: 200,
        data: {
          key: backupName,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        },
      })
    } catch (err: any) {
      if (err instanceof BackupAlreadyRunningError) {
        return res.status(429).json({ code: 429, message: err.message })
      }
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  const upload = multer({
    dest: backupDir,
    limits: { fileSize: BACKUP_FILE_SIZE_LIMIT },
  })

  router.post('/api/backups/upload', requireSuperuserAuth(app), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: 'No file provided' })
      }

      const originalName = req.file.originalname || `uploaded_${Date.now()}.zip`
      const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\./g, '_')
      const targetPath = path.join(backupDir, sanitized)

      if (await pathExists(targetPath)) {
        await fsPromises.unlink(req.file.path)
        return res.status(409).json({ code: 409, message: `Backup "${sanitized}" already exists` })
      }

      await fsPromises.rename(req.file.path, targetPath)

      const stat = await fsPromises.stat(targetPath)
      res.json({
        code: 200,
        data: {
          key: sanitized,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        },
      })
    } catch (err: any) {
      if (req.file && await pathExists(req.file.path)) {
        await fsPromises.unlink(req.file.path)
      }
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/backups/:key/restore', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const backupKey = path.basename(req.params.key).replace(/\.\./g, '')
      const backupPath = path.join(backupDir, backupKey)

      if (!await pathExists(backupPath)) {
        return res.status(404).json({ code: 404, message: `Backup "${backupKey}" not found` })
      }

      await restoreStreamingBackup(app, backupPath)

      try {
        await app.onBackupRestore.trigger({ app, name: backupKey })
      } catch {
        // hook errors should not block the response
      }

      res.json({ code: 200, message: `Backup "${backupKey}" restored successfully` })
    } catch (err: any) {
      if (err instanceof BackupAlreadyRunningError) {
        return res.status(429).json({ code: 429, message: err.message })
      }
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.delete('/api/backups/:key', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const backupKey = path.basename(req.params.key).replace(/\.\./g, '')
      const backupPath = path.join(backupDir, backupKey)
      if (!await pathExists(backupPath)) {
        return res.status(404).json({ code: 404, message: `Backup "${backupKey}" not found` })
      }

      await fsPromises.unlink(backupPath)
      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}
