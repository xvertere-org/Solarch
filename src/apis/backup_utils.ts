
import path from 'path'
import fsPromises from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { BaseApp } from '../core/base'
import { ZipArchive } from 'archiver'

let _backupInProgress = false

export class BackupAlreadyRunningError extends Error {
  constructor() {
    super('A backup is already in progress. Please wait for it to complete.')
    this.name = 'BackupAlreadyRunningError'
  }
}

export async function createStreamingBackup(app: BaseApp, outputPath: string): Promise<void> {
  if (_backupInProgress) throw new BackupAlreadyRunningError()
  _backupInProgress = true

  try {
    try {
      app.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
      app.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
    } catch {
    }

    const tempDir = path.join(app.dataDir, '.backup_temp')
    await fsPromises.mkdir(tempDir, { recursive: true })

    const dbFiles = ['data.db', 'auxiliary.db']
    for (const dbFile of dbFiles) {
      const srcPath = path.join(app.dataDir, dbFile)
      if (await fileExists(srcPath)) {
        const destPath = path.join(tempDir, dbFile)
        if (dbFile === 'data.db') {
          try {
            await app.db().getDataDB().backup(destPath)
          } catch {
            await streamCopyFile(srcPath, destPath)
          }
        } else if (dbFile === 'auxiliary.db') {
          try {
            await app.db().getAuxDB().backup(destPath)
          } catch {
            await streamCopyFile(srcPath, destPath)
          }
        }
      }
    }

    const output = createWriteStream(outputPath)
    const archive = new ZipArchive({ zlib: { level: 6 } })

    const archivePromise = new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      output.on('error', reject)
    })

    archive.pipe(output)

    for (const dbFile of dbFiles) {
      const tempPath = path.join(tempDir, dbFile)
      if (await fileExists(tempPath)) {
        archive.file(tempPath, { name: dbFile })
      }
    }

    const storageDir = path.join(app.dataDir, 'storage')
    if (await fileExists(storageDir)) {
      archive.directory(storageDir, 'storage')
    }

    await archive.finalize()
    await archivePromise

    await fsPromises.rm(tempDir, { recursive: true, force: true })
  } finally {
    _backupInProgress = false
  }
}


export async function restoreStreamingBackup(app: BaseApp, backupPath: string): Promise<void> {
  if (_backupInProgress) throw new BackupAlreadyRunningError()
  _backupInProgress = true

  try {
    app.db().getDataDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
    app.db().getAuxDB().exec('PRAGMA wal_checkpoint(TRUNCATE)')
    app.resetBootstrapState()
    const restoreDir = path.join(app.dataDir, '.restore_temp')
    if (await fileExists(restoreDir)) {
      await fsPromises.rm(restoreDir, { recursive: true })
    }
    await fsPromises.mkdir(restoreDir, { recursive: true })

    try {
      const unzipper = require('unzipper')
      const zipStream = createReadStream(backupPath).pipe(unzipper.Parse())
      for await (const entry of zipStream) {
        const entryPath = entry.path as string
        const targetFile = path.join(restoreDir, entryPath)

        const resolved = path.resolve(targetFile)
        const base = path.resolve(restoreDir)
        if (!resolved.startsWith(base + path.sep) && resolved !== base) {
          entry.autodrain()
          continue
        }

        if (entry.type === 'Directory') {
          await fsPromises.mkdir(targetFile, { recursive: true })
          entry.autodrain()
        } else {
          await fsPromises.mkdir(path.dirname(targetFile), { recursive: true })
          await pipeline(entry, createWriteStream(targetFile))
        }
      }
    } catch {
      const MAX_JSZIP_FALLBACK_SIZE = 500 * 1024 * 1024
      const backupStat = await fsPromises.stat(backupPath)
      if (backupStat.size > MAX_JSZIP_FALLBACK_SIZE) {
        throw new Error(
          `Backup file (${Math.round(backupStat.size / 1024 / 1024)}MB) exceeds the ${Math.round(MAX_JSZIP_FALLBACK_SIZE / 1024 / 1024)}MB limit for in-memory restore. ` +
          `Install the "unzipper" package for streaming restore of large backups.`
        )
      }
      const JSZip = require('jszip')
      const zipData = await fsPromises.readFile(backupPath)
      const zip = await JSZip.loadAsync(zipData)

      const zipEntries = Object.entries(zip.files) as [string, any][]
      for (const [zipPath, zipEntry] of zipEntries) {
        if (zipEntry.dir) continue
        const targetFile = path.join(restoreDir, zipPath)
        const resolved = path.resolve(targetFile)
        const base = path.resolve(restoreDir)
        if (!resolved.startsWith(base + path.sep) && resolved !== base) {
          continue
        }

        await fsPromises.mkdir(path.dirname(targetFile), { recursive: true })
        const content = await zipEntry.async('nodebuffer')
        await fsPromises.writeFile(targetFile, content)
      }
    }
    const restoreDbFiles = ['data.db', 'auxiliary.db']
    for (const dbFile of restoreDbFiles) {
      const src = path.join(restoreDir, dbFile)
      const dst = path.join(app.dataDir, dbFile)
      if (await fileExists(src)) {
        for (const suffix of ['-wal', '-shm']) {
          const f = `${dst}${suffix}`
          if (await fileExists(f)) await fsPromises.unlink(f)
        }
        await streamCopyFile(src, dst)
      }
    }
    const restoreStorageDir = path.join(restoreDir, 'storage')
    const appStorageDir = path.join(app.dataDir, 'storage')
    if (await fileExists(restoreStorageDir)) {
      if (await fileExists(appStorageDir)) {
        await fsPromises.rm(appStorageDir, { recursive: true })
      }
      await fsPromises.mkdir(path.dirname(appStorageDir), { recursive: true })
      await fsPromises.cp(restoreStorageDir, appStorageDir, { recursive: true })
    }

    await fsPromises.rm(restoreDir, { recursive: true, force: true })
    await app.bootstrap()
  } finally {
    _backupInProgress = false
  }
}

export function isBackupInProgress(): boolean {
  return _backupInProgress
}
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}


async function streamCopyFile(src: string, dst: string): Promise<void> {
  await pipeline(createReadStream(src), createWriteStream(dst))
}
