export interface PaginationParams {
  page: number
  perPage: number
}

export const DEFAULT_PAGE = 1
export const DEFAULT_PER_PAGE = 30
export const MAX_PAGE = 10000
export const MAX_PER_PAGE = 200

export function calculateTotalPages(totalItems: number, perPage: number): number {
  if (totalItems <= 0 || perPage <= 0) {
    return 1
  }
  return Math.ceil(totalItems / perPage)
}

export function parsePagination(
  query: Record<string, any>,
  defaults: { page?: number; perPage?: number } = {}
): PaginationParams {
  const rawPage = parseInt(query?.page, 10)
  const rawPerPage = parseInt(query?.perPage, 10)

  let page = !isNaN(rawPage) && rawPage > 0 ? rawPage : (defaults.page ?? DEFAULT_PAGE)
  let perPage = !isNaN(rawPerPage) && rawPerPage > 0 ? rawPerPage : (defaults.perPage ?? DEFAULT_PER_PAGE)

  page = Math.min(page, MAX_PAGE)
  perPage = Math.min(perPage, MAX_PER_PAGE)

  return { page, perPage }
}
