/**
 * @solarch/core-client - Pagination Helper Utilities
 */

import type { ListResult, RecordModel } from '../contracts/types.js'

export function calculateTotalPages(totalItems: number, perPage: number): number {
  if (perPage <= 0) return 0
  return Math.ceil(totalItems / perPage)
}

export function createEmptyListResult<T extends RecordModel = RecordModel>(
  page: number = 1,
  perPage: number = 30
): ListResult<T> {
  return {
    page,
    perPage,
    totalItems: 0,
    totalPages: 0,
    items: [],
  }
}
