import { describe, it, expect } from 'vitest'
import { filter, serializeFilterValue } from '../../src/utils/filter.js'

describe('Filter Template Helper Tests', () => {
  it('serializes primitives correctly', () => {
    expect(serializeFilterValue('hello')).toBe("'hello'")
    expect(serializeFilterValue("O'Reilly")).toBe("'O\\'Reilly'")
    expect(serializeFilterValue(123)).toBe('123')
    expect(serializeFilterValue(true)).toBe('true')
    expect(serializeFilterValue(false)).toBe('false')
    expect(serializeFilterValue(null)).toBe('null')
    expect(serializeFilterValue(undefined)).toBe('null')
  })

  it('interpolates parameters safely into template strings', () => {
    const query = filter('status = {:status} && views > {:minViews} && title ~ {:search}', {
      status: 'published',
      minViews: 50,
      search: "solarch's guide",
    })

    expect(query).toBe(
      "status = 'published' && views > 50 && title ~ 'solarch\\'s guide'"
    )
  })

  it('leaves unmatched placeholders intact when parameters are missing', () => {
    const query = filter('status = {:status} && category = {:cat}', {
      status: 'active',
    })

    expect(query).toBe("status = 'active' && category = {:cat}")
  })
})
