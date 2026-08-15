import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../../search/filter'
import { compileMongoFilter } from '../filter'
import { MongoDialect } from '../dialect'

describe('MongoDB Filter Compilation & Operator Injection Defense (DB-MONGO-17.5)', () => {
  const dialect = new MongoDialect()

  it('compiles standard equality filter to BSON $eq', () => {
    const ast = parseFilter("status = 'active'")
    const mongoFilter = compileMongoFilter(ast)
    expect(mongoFilter).toEqual({ status: { $eq: 'active' } })
  })

  it('compiles inequality and range operators', () => {
    const ast = parseFilter('views >= 100 && score < 50')
    const mongoFilter = compileMongoFilter(ast)
    expect(mongoFilter).toEqual({
      $and: [
        { views: { $gte: 100 } },
        { score: { $lt: 50 } },
      ],
    })
  })

  it('compiles like (~) operator to safe escaped regex', () => {
    const ast = parseFilter("title ~ 'solarch.*test'")
    const mongoFilter = compileMongoFilter(ast)
    // Regex dots should be escaped to prevent ReDoS / unescaped regex injection
    expect(mongoFilter).toEqual({
      title: {
        $regex: 'solarch\\.\\*test',
        $options: 'i',
      },
    })
  })

  it('compiles nested group with OR and AND', () => {
    const ast = parseFilter("category = 'tech' && (featured = true || views > 500)")
    const mongoFilter = compileMongoFilter(ast)
    expect(mongoFilter).toEqual({
      $and: [
        { category: { $eq: 'tech' } },
        {
          $or: [
            { featured: { $in: [true, 1] } },
            { views: { $gt: 500 } },
          ],
        },
      ],
    })
  })

  it('REJECTS operator injection via field name starting with $', () => {
    const maliciousAst = {
      type: 'expression' as const,
      field: '$where',
      operator: '=',
      value: 'this.password.length > 0',
    }
    expect(() => compileMongoFilter(maliciousAst)).toThrowError(/Invalid or dangerous field name/)
  })

  it('REJECTS prototype pollution via __proto__ or constructor', () => {
    const maliciousAst = {
      type: 'expression' as const,
      field: '__proto__.isAdmin',
      operator: '=',
      value: true,
    }
    expect(() => compileMongoFilter(maliciousAst)).toThrowError(/Invalid or dangerous field name/)
  })

  it('compiles dialect compileFilter correctly', () => {
    const ast = parseFilter("email = 'admin@example.com'")
    const query = dialect.compileFilter(ast)
    expect(query.text).toBe(JSON.stringify({ email: { $eq: 'admin@example.com' } }))
    expect(query.params).toEqual([])
  })

  it('builds stable sort specification with id ASC tie-break', () => {
    const sortSpec = dialect.buildSort('-created,+title')
    expect(JSON.parse(sortSpec)).toEqual({
      created: -1,
      title: 1,
      id: 1,
    })
  })
})
