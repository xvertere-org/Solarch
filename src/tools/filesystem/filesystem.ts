import { LocalBlobDriver, BlobDriver } from './driver'
import { S3BlobDriver } from './s3_driver'
import { S3Config } from '../../core/settings'
import fs from 'fs'
import path from 'path'

export interface FilesystemConfig {
  dataDir: string
  s3Config?: S3Config
}

export class Filesystem {
  private driver: BlobDriver
  private s3Config?: S3Config

  constructor(config: FilesystemConfig) {
    if (config.s3Config?.enabled) {
      this.s3Config = config.s3Config
      this.driver = new S3BlobDriver(config.s3Config)
    } else {
      this.driver = new LocalBlobDriver(path.join(config.dataDir, 'storage'))
    }
  }

  getDriver(): BlobDriver {
    return this.driver
  }

  async listFiles(prefix?: string): Promise<any[]> {
    return this.driver.list(prefix)
  }

  async getFile(key: string): Promise<any> {
    return this.driver.get(key)
  }

  async putFile(key: string, content: any, size?: number): Promise<void> {
    return this.driver.put(key, content, size)
  }

  async deleteFile(key: string): Promise<void> {
    return this.driver.delete(key)
  }

  async fileExists(key: string): Promise<boolean> {
    return this.driver.exists(key)
  }

  async getFileUrl(key: string): Promise<string> {
    return this.driver.url(key)
  }

  close(): void {
  }
}
