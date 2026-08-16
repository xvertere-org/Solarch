import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { BaseApp } from '../../core/base'
import express from 'express'
import request from 'supertest'
import { registerSettingsRoutes } from '../settings'
import { registerAdminAuthRoutes } from '../admin_auth'
import { loadAuthToken } from '../middlewares_auth'
import { MASKED_PLACEHOLDER } from '../settings'
import fs from 'fs'
import path from 'path'
import { hashPassword } from '../../tools/security/crypto'
import { SettingsEncryption } from '../../core/settings_encrypt'

describe('Settings API Security', () => {
  let app: BaseApp
  let server: express.Application
  let adminToken: string
  const testDataDir = path.join(__dirname, 'test_data_settings')

  beforeAll(async () => {
    process.env.JWT_SECRET = '12345678901234567890123456789012'
    
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true })
    fs.mkdirSync(testDataDir, { recursive: true })

    app = new BaseApp({
      isDev: true,
      dataDir: testDataDir,
      encryptionEnv: '1234567890123456',
    })
    await app.bootstrap()

    const db = app.db().getDataDB()
    const passwordHash = await hashPassword('password123')
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _superusers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        passwordHash TEXT,
        created TEXT,
        updated TEXT
      )
    `).run()
    db.prepare(`
      INSERT INTO _superusers (id, username, passwordHash, created, updated) 
      VALUES (?, ?, ?, ?, ?)
    `).run('su_1', 'admin@example.com', passwordHash, new Date().toISOString(), new Date().toISOString())

    server = express()
    server.use(express.json())
    server.use(loadAuthToken(app))
    registerAdminAuthRoutes(app, server)
    registerSettingsRoutes(app, server)

    const res = await request(server)
      .post('/api/admins/auth-with-password')
      .send({ identity: 'admin@example.com', password: 'password123' })
    
    adminToken = res.body.token
    expect(adminToken).toBeDefined()
  })

  afterAll(async () => {
    if (app) await app.resetBootstrapState()
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true })
  })

  it('authenticated admins can read safe settings but plaintext secrets never appear', async () => {
    // Seed a secret
    const settings = app.settings()
    settings.smtp.password = 'secret_smtp_123'
    settings.s3.secret = 'secret_s3_123'
    settings.ai.apiKey = 'secret_ai_123'
    
    // Save bypassing safe mask for test setup
    const encryption = new SettingsEncryption(app)
    const encrypted = await encryption.encryptSettings(settings)
    app.db().getDataDB().prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
      JSON.stringify(encrypted), new Date().toISOString()
    )
    await app.reloadSettings()

    const res = await request(server)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    
    expect(res.body.jwtSecret).toBe('')
    expect(res.body.smtp.password).toBe(MASKED_PLACEHOLDER)
    expect(res.body.s3.secret).toBe(MASKED_PLACEHOLDER)
    expect(res.body.ai.apiKey).toBe(MASKED_PLACEHOLDER)
    
    // Plaintext should NOT be in the response anywhere
    const rawRes = JSON.stringify(res.body)
    expect(rawRes).not.toContain('secret_smtp_123')
    expect(rawRes).not.toContain('secret_s3_123')
    expect(rawRes).not.toContain('secret_ai_123')
  })

  it('masked secrets survive an unrelated PATCH', async () => {
    const res = await request(server)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        appName: 'HackedApp',
        jwtSecret: MASKED_PLACEHOLDER,
        smtp: { password: MASKED_PLACEHOLDER }
      })

    expect(res.status).toBe(200)
    
    // The response should still be masked
    expect(res.body.jwtSecret).toBe('')
    expect(res.body.smtp.password).toBe(MASKED_PLACEHOLDER)

    // The backend should still retain the actual secrets
    await app.reloadSettings()
    expect(app.settings().jwtSecret).toBe('')
    expect(app.settings().smtp.password).toBe('secret_smtp_123')
    expect(app.settings().appName).toBe('HackedApp')
  })

  it('sensitive values are never returned by mutation responses', async () => {
    const res = await request(server)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        jwtSecret: 'new_secret_123'
      })

    expect(res.status).toBe(200)
    
    // The response should be masked
    expect(res.body.jwtSecret).toBe(MASKED_PLACEHOLDER)
    
    // The backend should retain the actual NEW secret
    await app.reloadSettings()
    expect(app.settings().jwtSecret).toBe('new_secret_123')
  })

  it('unauthorized requests to settings/test endpoints are rejected', async () => {
    const resS3 = await request(server)
      .post('/api/settings/test/s3')
      .send({ config: { s3: { secret: 'test' } } })
    expect(resS3.status).toBe(403)

    // Using a guest token or non-admin token
    const db = app.db().getDataDB()
    const passwordHash = await hashPassword('password123')
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _users (id TEXT PRIMARY KEY, email TEXT UNIQUE, passwordHash TEXT, collectionId TEXT)
    `).run()
    db.prepare(`INSERT INTO _users (id, email, passwordHash, collectionId) VALUES (?, ?, ?, ?)`).run('u_1', 'user@example.com', passwordHash, 'col1')
    
    // Make token
    const userToken = app.generateJWT({ id: 'u_1', type: 'auth', collectionId: 'col1' }, app.getJwtSecret(), '1h')
    
    const resAuthS3 = await request(server)
      .post('/api/settings/test/s3')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ config: { s3: { secret: 'test' } } })
    expect(resAuthS3.status).toBe(403)
  })

  it('test-before-save does not persist temporary credentials', async () => {
    // Seed initial setting
    const settings = app.settings()
    settings.s3.secret = 'real_s3_secret'
    const encryption = new SettingsEncryption(app)
    const encrypted = await encryption.encryptSettings(settings)
    app.db().getDataDB().prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
      JSON.stringify(encrypted), new Date().toISOString()
    )
    await app.reloadSettings()

    const res = await request(server)
      .post('/api/settings/test/s3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        config: {
          s3: {
            enabled: true,
            secret: 'temporary_test_secret_123'
          }
        }
      })
    
    // S3 test might fail because it tries to actually connect to AWS with dummy data, 
    // but the point is to test persistence. The status doesn't matter (500 or 200).
    // What matters is the DB is unchanged.
    
    await app.reloadSettings()
    expect(app.settings().s3.secret).toBe('real_s3_secret')
  })

  it('malformed config cannot bypass validation', async () => {
    const res = await request(server)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        maliciousKey: 'hacked',
        smtp: {
          maliciousNested: 'hacked2',
          host: 'smtp.example.com'
        },
        // Using an array where object is expected
        rateLimits: ['hacked3']
      })
    
    expect(res.status).toBe(200)
    
    await app.reloadSettings()
    const saved = app.settings()
    
    expect((saved as any).maliciousKey).toBeUndefined()
    expect((saved.smtp as any).maliciousNested).toBeUndefined()
    expect(saved.smtp.host).toBe('smtp.example.com')
    // Rate limits shouldn't have been overwritten with an array (since deep validate expects object with 'enabled'/'rules')
    expect(Array.isArray(saved.rateLimits)).toBe(false)
  })
})
