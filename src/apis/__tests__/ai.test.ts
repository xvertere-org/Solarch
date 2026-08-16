import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { BaseApp } from '../../core/base'
import express from 'express'
import request from 'supertest'
import { registerAIRoutes } from '../ai'
import { registerAdminAuthRoutes } from '../admin_auth'
import { loadAuthToken } from '../middlewares_auth'
import fs from 'fs'
import path from 'path'
import { hashPassword } from '../../tools/security/crypto'

describe('AI API /api/ai/chat', () => {
  let app: BaseApp
  let server: express.Application
  let adminToken: string
  const testDataDir = path.join(__dirname, 'test_data_ai')

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
    registerAIRoutes(app, server)

    const res = await request(server)
      .post('/api/admins/auth-with-password')
      .send({ identity: 'admin@example.com', password: 'password123' })
    
    adminToken = res.body.token
    expect(adminToken).toBeDefined()

    // Set up mock AI provider using settings
    const settings = app.settings()
    settings.ai.enabled = true
    settings.ai.apiKey = 'test-key'
    settings.ai.provider = 'custom' // forces fallback to OpenAIProvider
    const { SettingsEncryption } = await import('../../core/settings_encrypt')
    const encryption = new SettingsEncryption(app)
    const encrypted = await encryption.encryptSettings(settings)
    app.db().getDataDB().prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
      JSON.stringify(encrypted), new Date().toISOString()
    )
    await app.reloadSettings()
  })

  afterAll(async () => {
    if (app) await app.resetBootstrapState()
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true })
  })

  it('4. empty messages array → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [] })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Messages array is required')
  })

  it('5. missing messages → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('6. invalid message structure → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: "not an array" })
    expect(res.status).toBe(400)
  })

  it('7. invalid role → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'admin', content: 'hello' }] })
    expect(res.status).toBe(400)
  })

  it('8. system role injection → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'system', content: 'hello' }] })
    expect(res.status).toBe(400)
  })

  it('9. developer role injection → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'developer', content: 'hello' }] })
    expect(res.status).toBe(400)
  })

  it('10. tool role injection → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'tool', content: 'hello' }] })
    expect(res.status).toBe(400)
  })

  it('11. whitespace-only content → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'user', content: '   \n  ' }] })
    expect(res.status).toBe(400)
  })

  it('12. non-string content → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'user', content: { text: 'hello' } }] })
    expect(res.status).toBe(400)
  })

  it('13. >50 messages → 400', async () => {
    const messages = Array.from({ length: 51 }).map((_, i) => ({ role: 'user', content: `test ${i}` }))
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Maximum is 50')
  })

  it('14. message >10,000 chars → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'user', content: 'a'.repeat(10001) }] })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('10,000 characters')
  })

  it('15. total content >64,000 chars → 400', async () => {
    const messages = Array.from({ length: 7 }).map(() => ({ role: 'user', content: 'a'.repeat(10000) }))
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('64,000 characters')
  })

  it('16. final assistant message → 400', async () => {
    const res = await request(server)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }] })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('final message must be from the user')
  })

  it('1. valid single user message, 17. system prompt always generated, 18. client cannot replace system prompt', async () => {
    const originalFetch = global.fetch
    let capturedBody: any = null
    global.fetch = async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
      if (url.toString().includes('api.openai.com')) {
        capturedBody = JSON.parse(init?.body as string)
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'mocked reply' } }]
        }), { status: 200 })
      }
      return originalFetch(url, init)
    }

    try {
      const res = await request(server)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ messages: [{ role: 'user', content: 'hello server' }] })
      
      expect(res.status).toBe(200)
      expect(res.body.reply).toBe('mocked reply')
      
      expect(capturedBody).toBeTruthy()
      expect(capturedBody.messages[0].role).toBe('system')
      expect(capturedBody.messages[0].content).toContain('You are Solarch AI Assistant')
      expect(capturedBody.messages[1].role).toBe('user')
      expect(capturedBody.messages[1].content).toBe('hello server')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('2. valid multi-turn conversation, 3. previous user + assistant history reaches AIService', async () => {
    const originalFetch = global.fetch
    let capturedBody: any = null
    global.fetch = async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
      if (url.toString().includes('api.openai.com')) {
        capturedBody = JSON.parse(init?.body as string)
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'second reply' } }]
        }), { status: 200 })
      }
      return originalFetch(url, init)
    }

    try {
      const messages = [
        { role: 'user', content: 'first prompt' },
        { role: 'assistant', content: 'first reply' },
        { role: 'user', content: 'second prompt' }
      ]
      const res = await request(server)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ messages })
      
      expect(res.status).toBe(200)
      
      expect(capturedBody.messages.length).toBe(4) // 1 system + 3 turns
      expect(capturedBody.messages[0].role).toBe('system')
      expect(capturedBody.messages[1].role).toBe('user')
      expect(capturedBody.messages[1].content).toBe('first prompt')
      expect(capturedBody.messages[2].role).toBe('assistant')
      expect(capturedBody.messages[2].content).toBe('first reply')
      expect(capturedBody.messages[3].role).toBe('user')
      expect(capturedBody.messages[3].content).toBe('second prompt')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('19. provider failure is safely returned, 20. provider secrets not exposed', async () => {
    const originalFetch = global.fetch
    global.fetch = async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
      if (url.toString().includes('api.openai.com')) {
        return new Response('{"error": "Invalid API key provided: secret_key_123"}', { status: 401 })
      }
      return originalFetch(url, init)
    }

    try {
      const res = await request(server)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ messages: [{ role: 'user', content: 'hello' }] })
      
      expect(res.status).toBe(500)
      expect(res.body.message).toBe('Internal server error')
      expect(JSON.stringify(res.body)).not.toContain('secret_key_123')
    } finally {
      global.fetch = originalFetch
    }
  })
})
