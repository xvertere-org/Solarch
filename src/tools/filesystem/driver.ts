import { promises as fsPromises } from 'fs'
import fs from 'fs'
import path from 'path'
import { Readable, Writable } from 'stream'

export interface FileAttributes {
  key: string
  size: number
  modified: Date
  mimeType?: string
  etag?: string
}

export abstract class BlobDriver {
  abstract list(prefix?: string): Promise<FileAttributes[]>
  abstract get(key: string): Promise<Readable>
  abstract put(key: string, content: Readable | Buffer | string, size?: number): Promise<void>
  abstract delete(key: string): Promise<void>
  abstract exists(key: string): Promise<boolean>
  abstract url(key: string): Promise<string>
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

export class LocalBlobDriver extends BlobDriver {
  private basePath: string

  constructor(basePath: string) {
    super()
    this.basePath = basePath
    // One-time startup mkdir — sync is acceptable here
    fs.mkdirSync(basePath, { recursive: true })
  }

  // FIXED[H-1]: Converted all sync fs calls to async fs/promises
  async list(prefix = ''): Promise<FileAttributes[]> {
    const dir = path.join(this.basePath, prefix)
    if (!await pathExists(dir)) return []

    const files: FileAttributes[] = []
    const walk = async (currentDir: string, currentPrefix: string) => {
      const entries = await fsPromises.readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        const fullPrefix = path.join(currentPrefix, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath, fullPrefix)
        } else {
          const stat = await fsPromises.stat(fullPath)
          files.push({
            key: fullPrefix,
            size: stat.size,
            modified: stat.mtime,
          })
        }
      }
    }

    await walk(dir, prefix)
    return files
  }

  async get(key: string): Promise<Readable> {
    const filePath = path.join(this.basePath, key)
    if (!await pathExists(filePath)) {
      throw new Error(`File not found: ${key}`)
    }
    return fs.createReadStream(filePath)
  }

  async put(key: string, content: Readable | Buffer | string, size?: number): Promise<void> {
    const filePath = path.join(this.basePath, key)
    const dir = path.dirname(filePath)
    await fsPromises.mkdir(dir, { recursive: true })

    if (Buffer.isBuffer(content)) {
      await fsPromises.writeFile(filePath, content)
    } else if (typeof content === 'string') {
      await fsPromises.writeFile(filePath, content)
    } else {
      const writeStream = fs.createWriteStream(filePath)
      await new Promise<void>((resolve, reject) => {
        content.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key)
    if (await pathExists(filePath)) {
      await fsPromises.unlink(filePath)
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key)
    return pathExists(filePath)
  }

  async url(key: string): Promise<string> {
    return path.join(this.basePath, key)
  }
}
