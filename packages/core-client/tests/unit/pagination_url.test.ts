import { describe, it, expect } from 'vitest'
import { calculateTotalPages, createEmptyListResult } from '../../src/utils/pagination.js'
import { normalizeBaseUrl, joinUrlPath } from '../../src/utils/url.js'

describe('Pagination & URL Utilities Unit Tests', () => {
  it('calculates total pages correctly', () => {
    expect(calculateTotalPages(10, 5)).toBe(2)
    expect(calculateTotalPages(11, 5)).toBe(3)
    expect(calculateTotalPages(0, 10)).toBe(0)
    expect(calculateTotalPages(5, 0)).toBe(0)
  })

  it('creates empty list result correctly', () => {
    const res = createEmptyListResult(2, 50)
    expect(res).toEqual({
      page: 2,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
      items: [],
    })
  })

  it('normalizes base URLs properly', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8090/')).toBe('http://127.0.0.1:8090')
    expect(normalizeBaseUrl('http://127.0.0.1:8090///')).toBe('http://127.0.0.1:8090')
    expect(normalizeBaseUrl('')).toBe('/')
    expect(normalizeBaseUrl('   ')).toBe('/')
  })

  it('joins URL paths correctly', () => {
    expect(joinUrlPath('http://127.0.0.1:8090', '/api/health')).toBe('http://127.0.0.1:8090/api/health')
    expect(joinUrlPath('http://127.0.0.1:8090/', 'api/health')).toBe('http://127.0.0.1:8090/api/health')
    expect(joinUrlPath('/', 'api/health')).toBe('/api/health')
  })
})
