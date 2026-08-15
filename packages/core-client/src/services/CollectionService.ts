/**
 * @solarch/core-client - CollectionService (Metadata & Schema)
 */

import type {
  CollectionModel,
  ListResult,
  PaginationParams,
} from '../contracts/types.js'
import type { HttpClient } from '../http/HttpClient.js'

export class CollectionService {
  constructor(readonly client: HttpClient) {}

  protected get basePath(): string {
    return '/api/collections'
  }

  async getList(
    page: number = 1,
    perPage: number = 30,
    options: PaginationParams = {}
  ): Promise<ListResult<CollectionModel>> {
    return this.client.get<ListResult<CollectionModel>>(this.basePath, {
      query: {
        page,
        perPage,
        ...options,
      },
    })
  }

  async getOne(idOrName: string): Promise<CollectionModel> {
    const cleanId = encodeURIComponent(idOrName)
    return this.client.get<CollectionModel>(`${this.basePath}/${cleanId}`)
  }

  async create(collection: Partial<CollectionModel>): Promise<CollectionModel> {
    return this.client.post<CollectionModel>(this.basePath, {
      body: collection,
    })
  }

  async update(
    idOrName: string,
    collection: Partial<CollectionModel>
  ): Promise<CollectionModel> {
    const cleanId = encodeURIComponent(idOrName)
    return this.client.patch<CollectionModel>(`${this.basePath}/${cleanId}`, {
      body: collection,
    })
  }

  async delete(idOrName: string): Promise<boolean> {
    const cleanId = encodeURIComponent(idOrName)
    await this.client.delete(`${this.basePath}/${cleanId}`)
    return true
  }

  async import(
    collections: Partial<CollectionModel>[],
    deleteMissing: boolean = false
  ): Promise<boolean> {
    await this.client.post(`${this.basePath}/import`, {
      body: {
        collections,
        deleteMissing,
      },
    })
    return true
  }
}
