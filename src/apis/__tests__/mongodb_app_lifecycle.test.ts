import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { Solarch } from '../../index'
import { serve } from '../serve'
import { Collection } from '../../core/collection'
import { RecordModel as PBRecord } from '../../core/record'
import { findRecordById, findAllRecords } from '../../core/record_query'
import { createSuperuser } from '../../cmd/superuser'
import request from 'supertest'

describe('Full Solarch Live Application Lifecycle on MongoDB (DB-MONGO-20)', () => {
  let replSet: MongoMemoryReplSet
  let uri: string
  let app: Solarch
  let server: any

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    uri = replSet.getUri()

    // 1. Startup & Config resolution with MongoDB
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      dbProvider: 'mongodb',
      connectionString: uri,
      database: 'solarch_app_live_test',
      queryTimeout: 10,
    })

    await app.bootstrap()
    server = await serve(app, 0)
  }, 60000)

  afterAll(async () => {
    if (server && server.close) {
      await new Promise(resolve => server.close(resolve))
    }
    if (app) {
      await app.db().getDriver().close()
    }
    if (replSet) {
      await replSet.stop()
    }
  }, 60000)

  it('Health Check: reports healthy database connection', async () => {
    const res = await request(server).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('Superuser & Auth Lifecycle: creates superuser, verifies password, and generates JWT', async () => {
    await createSuperuser({
      app,
      email: 'admin@example.com',
      password: 'SuperSecretPass123!',
    })

    // Find and verify superuser
    const found = await app.db().queryOne<{ id: string; email: string; passwordHash: string }>(
      'SELECT * FROM _superusers WHERE email = ?',
      ['admin@example.com'],
    )
    expect(found).not.toBeNull()
    const passwordValid = await app.verifyPassword('SuperSecretPass123!', found!.passwordHash)
    expect(passwordValid).toBe(true)

    // Token generation
    const token = app.generateJWT({ id: found!.id, type: 'superuser' }, app.getJwtSecret(), '24h')
    const parsed = app.parseJWT(token, app.getJwtSecret())
    expect(parsed?.id).toBe(found!.id)
    expect(parsed?.type).toBe('superuser')
  })

  it('Collection & Record CRUD: creates collection, inserts, queries, updates, and deletes records', async () => {
    // Create 'projects' collection
    const projCol = new Collection({
      id: 'col_projects_app',
      name: 'projects_app',
      type: 'base',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'budget', type: 'number' },
        { name: 'active', type: 'bool' },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    })
    await app.save(projCol)

    // Verify collection exists in catalog
    const fetchedCol = await app.findCollectionByNameOrId('projects_app')
    expect(fetchedCol).not.toBeNull()
    expect(fetchedCol!.name).toBe('projects_app')

    // Insert Record
    const rec = new PBRecord(projCol.id, projCol.name, {
      name: 'Alpha Project',
      budget: 50000,
      active: true,
    })
    rec.id = 'rec_proj_alpha'
    await app.save(rec)

    // Find by ID
    const foundRec = await findRecordById(app, 'projects_app', 'rec_proj_alpha')
    expect(foundRec).not.toBeNull()
    expect(foundRec!.get('name')).toBe('Alpha Project')
    expect(foundRec!.get('budget')).toBe(50000)
    expect(foundRec!.getBool('active')).toBe(true)

    // Update Record
    foundRec!.set('budget', 75000)
    await app.save(foundRec!)

    const updatedRec = await findRecordById(app, 'projects_app', 'rec_proj_alpha')
    expect(updatedRec!.get('budget')).toBe(75000)

    // List records with filter & sort
    const listRes = await findAllRecords(app, 'projects_app', {
      filter: 'budget > 50000 && active = true',
      sort: '-budget',
    })
    expect(listRes.items.length).toBe(1)
    expect(listRes.items[0].get('name')).toBe('Alpha Project')

    // Delete Record
    await app.delete(updatedRec!)
    const deletedRec = await findRecordById(app, 'projects_app', 'rec_proj_alpha')
    expect(deletedRec).toBeNull()
  })

  it('Auth Collection & User Lifecycle: handles user registration, token generation, and password verification', async () => {
    // Create auth collection 'app_members'
    const memberCol = new Collection({
      id: 'col_members_app',
      name: 'members_app',
      type: 'auth',
      fields: [{ name: 'nickname', type: 'text' }],
      authOptions: {
        allowEmailAuth: true,
        minPasswordLength: 8,
      },
    })
    await app.save(memberCol)

    const pwHash = await app.hashPassword('MemberPass12345!')
    const member = new PBRecord(memberCol.id, memberCol.name, {
      email: 'member1@example.com',
      passwordHash: pwHash,
      emailVisibility: true,
      verified: true,
      nickname: 'M1',
    })
    member.id = 'usr_m1_123'
    await app.save(member)

    const fetchedMember = await findRecordById(app, 'members_app', 'usr_m1_123')
    expect(fetchedMember).not.toBeNull()
    expect(fetchedMember!.get('email')).toBe('member1@example.com')
    const ok = await app.verifyPassword('MemberPass12345!', fetchedMember!.get('passwordHash'))
    expect(ok).toBe(true)
  })
})
