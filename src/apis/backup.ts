import { Router, Request, Response } from 'express'
import multer from 'multer'
import { BaseApp } from '../core/base'
import { requireSuperuserAuth } from './middlewares_auth'
import path from 'path'
import fs from 'fs'

const BACKUP_FILE_SIZE_LIMIT = 1024 * 1024 * 1024

function createBackupDir(app: BaseApp): string {
  const backupDir = path.join(app.dataDir, 'backups')
  fs.mkdirSync(backupDir, { recursive: true })
  return backupDir
}

function checkpointWalIfPossible(app: BaseApp): void {
  try {
    app.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
    app.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {
    // WAL checkpoint is best-effort during backup creation
  }
}

export function registerBackupRoutes(app: BaseApp, router: Router): void {
  const backupDir = createBackupDir(app)

  router.get('/api/backups', requireSuperuserAuth(app), async (_req: Request, res: Response) => {
    try {
      if (!fs.existsSync(backupDir)) {
        return res.json([])
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.zip'))
        .map((file: string) => {
          const stat = fs.statSync(path.join(backupDir, file))
          return {
            key: file,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          }
        })
        .sort((a: any, b: any) => b.modified.localeCompare(a.modified))

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

      if (fs.existsSync(backupPath)) {
        return res.status(409).json({ code: 409, message: `Backup "${backupName}" already exists` })
      }

      checkpointWalIfPossible(app)

      const JSZip = require('jszip')
      const zip = new JSZip()

      const dbFiles = ['data.db', 'auxiliary.db']
      for (const dbFile of dbFiles) {
        const dbPath = path.join(app.dataDir, dbFile)
        if (fs.existsSync(dbPath)) {
          zip.file(dbFile, fs.readFileSync(dbPath))
        }
      }

      const storageDir = path.join(app.dataDir, 'storage')
      if (fs.existsSync(storageDir)) {
        const addDirToZip = (dirPath: string, zipPath: string) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name)
            const zipEntryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name
            if (entry.isDirectory()) {
              addDirToZip(fullPath, zipEntryPath)
            } else {
              zip.file(`storage/${zipEntryPath}`, fs.readFileSync(fullPath))
            }
          }
        }
        addDirToZip(storageDir, '')
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      fs.writeFileSync(backupPath, zipBuffer)

      try {
        await app.onBackupCreate.trigger({ app, name: backupName })
      } catch {
        // hook errors should not block the response
      }

      const stat = fs.statSync(backupPath)
      res.json({
        code: 200,
        data: {
          key: backupName,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        },
      })
    } catch (err: any) {
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

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(req.file.path)
        return res.status(409).json({ code: 409, message: `Backup "${sanitized}" already exists` })
      }

      fs.renameSync(req.file.path, targetPath)

      const stat = fs.statSync(targetPath)
      res.json({
        code: 200,
        data: {
          key: sanitized,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        },
      })
    } catch (err: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.post('/api/backups/:key/restore', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const backupKey = path.basename(req.params.key).replace(/\.\./g, '')
      const backupPath = path.join(backupDir, backupKey)

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ code: 404, message: `Backup "${backupKey}" not found` })
      }

      const JSZip = require('jszip')
      const zipData = fs.readFileSync(backupPath)
      const zip = await JSZip.loadAsync(zipData)

      app.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
      app.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
      app.resetBootstrapState()

      const restoreDir = path.join(app.dataDir, '.restore_temp')
      if (fs.existsSync(restoreDir)) {
        fs.rmSync(restoreDir, { recursive: true })
      }
      fs.mkdirSync(restoreDir, { recursive: true })

      const zipEntries = Object.entries(zip.files) as [string, any][]
      for (const [zipPath, zipEntry] of zipEntries) {
        if (zipEntry.dir) continue
        const targetFile = path.join(restoreDir, zipPath)
        // Zip slip protection: ensure resolved path stays within restoreDir
        const resolved = path.resolve(targetFile)
        const base = path.resolve(restoreDir)
        if (!resolved.startsWith(base + path.sep)) {
          throw new Error(`Zip slip detected: entry "${zipPath}" would escape restore directory`)
        }
        fs.mkdirSync(path.dirname(targetFile), { recursive: true })
        const content = await zipEntry.async('nodebuffer')
        fs.writeFileSync(targetFile, content)
      }

      const restoreDbFiles = ['data.db', 'auxiliary.db']
      for (const dbFile of restoreDbFiles) {
        const src = path.join(restoreDir, dbFile)
        const dst = path.join(app.dataDir, dbFile)
        if (fs.existsSync(src)) {
          const walFile = `${dst}-wal`
          const shmFile = `${dst}-shm`
          if (fs.existsSync(walFile)) fs.unlinkSync(walFile)
          if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile)
          fs.copyFileSync(src, dst)
        }
      }

      const restoreStorageDir = path.join(restoreDir, 'storage')
      const appStorageDir = path.join(app.dataDir, 'storage')
      if (fs.existsSync(restoreStorageDir)) {
        if (fs.existsSync(appStorageDir)) {
          fs.rmSync(appStorageDir, { recursive: true })
        }
        fs.mkdirSync(path.dirname(appStorageDir), { recursive: true })
        fs.cpSync(restoreStorageDir, appStorageDir, { recursive: true })
      }

      fs.rmSync(restoreDir, { recursive: true })

      await app.bootstrap()

      try {
        await app.onBackupRestore.trigger({ app, name: backupKey })
      } catch {
        // hook errors should not block the response
      }

      res.json({ code: 200, message: `Backup "${backupKey}" restored successfully` })
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })

  router.delete('/api/backups/:key', requireSuperuserAuth(app), async (req: Request, res: Response) => {
    try {
      const backupKey = path.basename(req.params.key).replace(/\.\./g, '')
      const backupPath = path.join(backupDir, backupKey)

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ code: 404, message: `Backup "${backupKey}" not found` })
      }

      fs.unlinkSync(backupPath)
      res.status(204).send()
    } catch (err: any) {
      app.logger().error(err.message || err)
      res.status(500).json({ code: 500, message: 'Internal server error' })
    }
  })
}
