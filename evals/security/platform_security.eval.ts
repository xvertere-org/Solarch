import { describe, it, expect } from 'vitest'
import { parseFilter } from '../../src/tools/search/filter'
import { SqliteQueryBuilder } from '../../src/tools/search/query-builder'
import { canAccessRecord } from '../../src/apis/record_helpers'
import { RecordModel } from '../../src/core/record'
import { Collection } from '../../src/core/collection'

describe('Platform Security Regression Evaluation (SmartTransit & Live Quiz Security Baseline)', () => {
  const qb = new SqliteQueryBuilder()

  describe('1. Query Injection Prevention', () => {
    it('never allows SQL injection through filter values or identifiers', () => {
      const maliciousFilter = 'title = "foo\'; DROP TABLE records; --"'
      const ast = parseFilter(maliciousFilter)
      const { where, params } = qb.buildWhere(ast)

      expect(where).toBe('title = ?')
      expect(params).toEqual(["foo'; DROP TABLE records; --"])
    })

    it('rejects attempt to break out with malicious field names', () => {
      expect(() => {
        parseFilter('title" = "foo"')
      }).toThrow()
    })
  })

  describe('2. Row-Level Authorization Rule Evaluation', () => {
    const secretCollection = new Collection({
      id: 'col_confidential',
      name: 'confidential_docs',
      type: 'base',
      schema: [{ name: 'owner', type: 'relation' }, { name: 'content', type: 'text' }],
      listRule: '@request.auth.id != "" && owner = @request.auth.id',
      viewRule: '@request.auth.id != "" && owner = @request.auth.id',
    })

    const ownRecord = new RecordModel('col_confidential', 'confidential_docs', {
      id: 'rec_1',
      owner: 'user_alice',
      content: 'Alice secret',
    })

    const otherRecord = new RecordModel('col_confidential', 'confidential_docs', {
      id: 'rec_2',
      owner: 'user_bob',
      content: 'Bob secret',
    })

    it('permits record access when auth context matches owner rule', async () => {
      const aliceContext = {
        auth: new RecordModel('users', 'users', { id: 'user_alice', email: 'alice@example.com' }),
        isAdmin: false,
      }
      expect(await canAccessRecord(null as any, ownRecord, secretCollection, secretCollection.viewRule, aliceContext as any)).toBe(true)
    })

    it('strictly denies record access when auth context belongs to a different user (role escalation guard)', async () => {
      const aliceContext = {
        auth: new RecordModel('users', 'users', { id: 'user_alice', email: 'alice@example.com' }),
        isAdmin: false,
      }
      expect(await canAccessRecord(null as any, otherRecord, secretCollection, secretCollection.viewRule, aliceContext as any)).toBe(false)
    })

    it('denies access to anonymous unauthenticated requests on protected collection', async () => {
      const anonContext = {
        auth: null,
        isAdmin: false,
      }
      expect(await canAccessRecord(null as any, ownRecord, secretCollection, secretCollection.viewRule, anonContext as any)).toBe(false)
    })

    it('allows superuser / admin access bypass', async () => {
      const adminContext = {
        auth: null,
        isAdmin: true,
      }
      expect(await canAccessRecord(null as any, otherRecord, secretCollection, secretCollection.viewRule, adminContext as any)).toBe(true)
    })
  })
})
