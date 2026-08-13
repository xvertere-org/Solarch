import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { Collection } from '../../../core/collection'
import { RecordModel as PBRecord } from '../../../core/record'
import { canAccessRecord, checkCollectionAccess } from '../../record_helpers'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Cross-Surface Authorization & Transport Parity (CORE-7)', () => {
  let app: Solarch
  let tempDir: string
  let protectedCollection: Collection
  let authorRecord: PBRecord

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-authz-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    protectedCollection = new Collection({
      name: 'private_notes',
      type: 'base',
      listRule: '@request.auth.id != "" && author = @request.auth.id',
      viewRule: '@request.auth.id != "" && author = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'author = @request.auth.id',
      deleteRule: 'author = @request.auth.id',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'author', type: 'text' },
      ],
    })
    await app.save(protectedCollection)

    authorRecord = new PBRecord(protectedCollection.id, protectedCollection.name, {
      title: 'Secret Note',
      author: 'user_123',
    })
    await app.save(authorRecord)
  })

  afterAll(async () => {
    if (app) await app.db().close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('prohibits unauthenticated access identically across rules', async () => {
    const unauthContext = {
      auth: null,
      isAdmin: false,
      method: 'GET',
      headers: {},
      query: {},
      body: {},
      data: {},
      context: 'view' as const,
    }

    const canView = await canAccessRecord(app, authorRecord, protectedCollection, protectedCollection.viewRule, unauthContext)
    expect(canView).toBe(false)

    const canList = await checkCollectionAccess(app, protectedCollection, 'list', authorRecord, unauthContext)
    expect(canList).toBe(false)
  })

  it('allows access for matching owner record', async () => {
    const ownerContext = {
      auth: new PBRecord('users', 'users', { id: 'user_123', email: 'user@example.com' }),
      isAdmin: false,
      method: 'GET',
      headers: {},
      query: {},
      body: {},
      data: {},
      context: 'view' as const,
    }

    const canView = await canAccessRecord(app, authorRecord, protectedCollection, protectedCollection.viewRule, ownerContext)
    expect(canView).toBe(true)
  })

  it('prohibits access for non-matching authenticated user', async () => {
    const intruderContext = {
      auth: new PBRecord('users', 'users', { id: 'user_other', email: 'other@example.com' }),
      isAdmin: false,
      method: 'GET',
      headers: {},
      query: {},
      body: {},
      data: {},
      context: 'view' as const,
    }

    const canView = await canAccessRecord(app, authorRecord, protectedCollection, protectedCollection.viewRule, intruderContext)
    expect(canView).toBe(false)
  })

  it('allows superuser to bypass all rules', async () => {
    const adminContext = {
      auth: null,
      isAdmin: true,
      method: 'GET',
      headers: {},
      query: {},
      body: {},
      data: {},
      context: 'view' as const,
    }

    const canView = await canAccessRecord(app, authorRecord, protectedCollection, protectedCollection.viewRule, adminContext)
    expect(canView).toBe(true)
  })
})
