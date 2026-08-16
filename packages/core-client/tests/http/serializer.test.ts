import { describe, it, expect } from 'vitest'
import { serializeQueryParams } from '../../src/http/serializer.js'

describe('serializeQueryParams Unit Tests', () => {
  it('returns empty string for undefined input', () => {
    expect(serializeQueryParams(undefined)).toBe('')
  })

  it('returns empty string for empty object', () => {
    expect(serializeQueryParams({})).toBe('')
  })

  it('serializes simple string values', () => {
    const result = serializeQueryParams({ filter: 'active=true', sort: '-created' })
    expect(result).toContain('filter=active%3Dtrue')
    expect(result).toContain('sort=-created')
    expect(result.startsWith('?')).toBe(true)
  })

  it('serializes number values as strings', () => {
    const result = serializeQueryParams({ page: 2, perPage: 10 })
    expect(result).toContain('page=2')
    expect(result).toContain('perPage=10')
  })

  it('serializes boolean values as strings', () => {
    const result = serializeQueryParams({ download: true, preview: false })
    expect(result).toContain('download=true')
    expect(result).toContain('preview=false')
  })

  it('skips null and undefined values', () => {
    const result = serializeQueryParams({ name: 'hello', empty: null, missing: undefined })
    expect(result).toContain('name=hello')
    expect(result).not.toContain('empty')
    expect(result).not.toContain('missing')
  })

  it('serializes arrays as repeated keys', () => {
    const result = serializeQueryParams({ tags: ['a', 'b', 'c'] })
    expect(result).toContain('tags=a')
    expect(result).toContain('tags=b')
    expect(result).toContain('tags=c')
  })

  it('skips null/undefined items in arrays', () => {
    const result = serializeQueryParams({ tags: ['a', null, undefined, 'b'] })
    expect(result).toContain('tags=a')
    expect(result).toContain('tags=b')
    expect(result).not.toContain('tags=null')
  })

  it('JSON-stringifies object items in arrays', () => {
    const result = serializeQueryParams({ fields: [{ name: 'title' }] })
    expect(result).toContain('fields=')
    // URL-encoded JSON
    expect(decodeURIComponent(result)).toContain('{"name":"title"}')
  })

  it('JSON-stringifies plain object values', () => {
    const result = serializeQueryParams({ expand: { relField: true } })
    expect(decodeURIComponent(result)).toContain('{"relField":true}')
  })

  it('handles special characters in keys and values', () => {
    const result = serializeQueryParams({ 'my key': 'my value with spaces' })
    expect(result).toContain('my+key=my+value+with+spaces')
  })

  it('returns string starting with ? when params exist', () => {
    const result = serializeQueryParams({ a: '1' })
    expect(result).toBe('?a=1')
  })
})
