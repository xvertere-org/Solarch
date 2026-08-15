import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { serve } from '../../serve'
import { normalizeDatabaseError, createApiError } from '../../../utils/api_errors'
import request from 'supertest'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Canonical Error Contract (CORE-2)', () => {
  let app: Solarch
  let server: http.Server
  let tempDir: string

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-err-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    await app.migrate()
    server = await serve(app, 0)
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
    if (app) {
      await app.db().close()
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns canonical 404 NOT_FOUND error on nonexistent collection', async () => {
    const res = await request(server).get('/api/collections/nonexistent_col/records')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('code', 404)
    expect(res.body).toHaveProperty('status', 'NOT_FOUND')
    expect(res.body).toHaveProperty('message')
    expect(typeof res.body.message).toBe('string')
  })

  it('returns canonical 404 NOT_FOUND error on nonexistent record', async () => {
    const res = await request(server).get('/api/collections/users/records/nonexistent_id')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('code', 404)
    expect(res.body).toHaveProperty('status', 'NOT_FOUND')
  })

  it('normalizes SQLite unique constraint errors to 400 VALIDATION_FAILED', () => {
    const sqliteErr = {
      code: 'SQLITE_CONSTRAINT_UNIQUE',
      message: 'UNIQUE constraint failed: _r_users.email',
    }
    const normalized = normalizeDatabaseError(sqliteErr)
    expect(normalized.code).toBe(400)
    expect(normalized.status).toBe('VALIDATION_FAILED')
    expect(normalized.data?.fieldErrors?.general?.code).toBe('validation_not_unique')
  })

  it('normalizes PostgreSQL unique constraint errors (code 23505) to 400 VALIDATION_FAILED', () => {
    const pgErr = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "_r_users_email_idx"',
    }
    const normalized = normalizeDatabaseError(pgErr)
    expect(normalized.code).toBe(400)
    expect(normalized.status).toBe('VALIDATION_FAILED')
    expect(normalized.data?.fieldErrors?.general?.code).toBe('validation_not_unique')
  })

  it('normalizes foreign key errors to 400 VALIDATION_FAILED', () => {
    const fkErr = {
      code: '23503',
      message: 'insert or update on table "_r_posts" violates foreign key constraint',
    }
    const normalized = normalizeDatabaseError(fkErr)
    expect(normalized.code).toBe(400)
    expect(normalized.status).toBe('VALIDATION_FAILED')
    expect(normalized.data?.fieldErrors?.general?.code).toBe('validation_foreign_key')
  })

  it('includes protocol version header in all responses', async () => {
    const res = await request(server).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.headers['x-solarch-protocol']).toBe('1.0')
  })

  it('returns canonical 400 VALIDATION_FAILED on invalid admin auth payload', async () => {
    const res = await request(server)
      .post('/api/admins/auth-with-password')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('code', 400)
    expect(res.body).toHaveProperty('status', 'VALIDATION_FAILED')
    expect(res.body).toHaveProperty('message')
  })

  it('returns canonical 400 UNAUTHORIZED on invalid admin credentials', async () => {
    const res = await request(server)
      .post('/api/admins/auth-with-password')
      .send({ identity: 'nonexistent@admin.com', password: 'wrongpassword123' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('code', 400)
    expect(res.body).toHaveProperty('status', 'UNAUTHORIZED')
    expect(res.body).toHaveProperty('message')
  })

  it('returns canonical 400 VALIDATION_FAILED on invalid collection import structure', async () => {
    await app.db().execute(`
      CREATE TABLE IF NOT EXISTS _superusers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)
    const adminId = 'admin_envelope_test'
    await app.db().execute(
      `INSERT INTO _superusers (id, email, passwordHash, created, updated) VALUES (?, ?, ?, ?, ?)`,
      [adminId, 'admin_envelope@example.com', 'hash', new Date().toISOString(), new Date().toISOString()]
    )
    const adminToken = app.generateJWT({ id: adminId, type: 'admin' }, app.getJwtSecret(), '1h')
    const res = await request(server)
      .post('/api/collections/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ collections: 'not_an_array' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('code', 400)
    expect(res.body).toHaveProperty('status', 'VALIDATION_FAILED')
  })
})
