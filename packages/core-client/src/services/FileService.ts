/**
 * @solarch/core-client - FileService
 */

import type { FileOptions, RecordModel } from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class FileService {
  constructor(readonly client: HttpClient) {}

  getUrl(
    record: RecordModel | { id: string; collectionId?: string; collectionName?: string; [key: string]: any },
    filename: string,
    options: FileOptions = {}
  ): string {
    if (!filename) return ''

    const collection = record.collectionId || record.collectionName || record['@collectionId'] || record['@collectionName'] || ''
    const recordId = record.id || ''

    if (!collection || !recordId) {
      throw new Error(
        'Unable to construct file URL: record missing id or collectionId/collectionName.'
      )
    }

    const path = `/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`
    return this.client.buildUrl(path, options)
  }

  async getToken(
    collectionIdOrName: string,
    recordId: string,
    filename: string
  ): Promise<string> {
    const res = await this.client.post<{ token: string }>('/api/files/token', {
      body: {
        collection: collectionIdOrName,
        recordId,
        filename,
      },
    })
    return res?.token || ''
  }
}
