import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { BaseApp } from '../../core/base'
import express from 'express'
import request from 'supertest'
import { registerLogRoutes } from '../logs'
import { loadAuthToken } from '../middlewares_auth'
import fs from 'fs'
import path from 'path'
import { hashPassword } from '../../tools/security/crypto'

describe('Logs API Security & Search', () => {
  let app: BaseApp
  let server: express.Application
  let adminToken: string
  let userToken: string
  const testDataDir = path.join(__dirname, 'test_data_logs')

  beforeAll(async () => {
    process.env.JWT_SECRET = '12345678901234567890123456789012'
    
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true })
    fs.mkdirSync(testDataDir, { recursive: true })

    app = new BaseApp({
      isDev: true,
      dataDir: testDataDir,
    })
    await app.bootstrap()

    const db = app.db().getDataDB()
    const passwordHash = await hashPassword('password123')
    
    // Setup Admin
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

    adminToken = app.generateJWT({ id: 'su_1', type: 'admin' }, app.getJwtSecret(), '1h')

    // Setup Normal User
    db.prepare(`
      CREATE TABLE IF NOT EXISTS _users (id TEXT PRIMARY KEY, email TEXT UNIQUE, passwordHash TEXT, collectionId TEXT)
    `).run()
    db.prepare(`INSERT INTO _users (id, email, passwordHash, collectionId) VALUES (?, ?, ?, ?)`).run('u_1', 'user@example.com', passwordHash, 'col1')
    userToken = app.generateJWT({ id: 'u_1', type: 'auth', collectionId: 'col1' }, app.getJwtSecret(), '1h')

    // Seed Logs
    const stmt = db.prepare(`
      INSERT INTO _logs (id, level, message, data, created) 
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const logs = [
      { id: '1', level: 'info', message: 'System started', data: null, created: '2023-01-01T00:00:00Z' },
      { id: '2', level: 'error', message: 'Database connection failed', data: JSON.stringify({ code: 500 }), created: '2023-01-01T01:00:00Z' },
      { id: '3', level: 'warn', message: 'High memory usage', data: null, created: '2023-01-01T02:00:00Z' },
      { id: '4', level: 'debug', message: 'SQL query executed', data: JSON.stringify({ query: 'SELECT * FROM users' }), created: '2023-01-01T03:00:00Z' },
      { id: '5', level: 'info', message: 'User logged in', data: JSON.stringify({ user: 'admin@example.com' }), created: '2023-01-01T04:00:00Z' },
      { id: '6', level: 'error', message: 'Special chars % _ \' " in message', data: null, created: '2023-01-01T05:00:00Z' },
    ]
    
    logs.forEach(log => {
      stmt.run(log.id, log.level, log.message, log.data, log.created)
    })

    server = express()
    server.use(express.json())
    server.use(loadAuthToken(app))
    registerLogRoutes(app, server)
  })

  afterAll(async () => {
    if (app) await app.resetBootstrapState()
    if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true })
  })

  it('unauthenticated request -> 403', async () => {
    const res = await request(server).get('/api/logs')
    expect(res.status).toBe(403)
  })

  it('non-superuser request -> 403', async () => {
    const res = await request(server)
      .get('/api/logs')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('normal pagination works', async () => {
    const res = await request(server)
      .get('/api/logs?page=1&perPage=2')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2)
    expect(res.body.totalItems).toBe(6)
    expect(res.body.totalPages).toBe(3)
    // Ordered by created DESC, so latest first
    expect(res.body.items[0].id).toBe('6')
  })

  it('level filtering works', async () => {
    const res = await request(server)
      .get('/api/logs?level=error')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2) // id 2 and 6
    expect(res.body.items.every((item: any) => item.level === 'error')).toBe(true)
  })

  it('search filtering works against message and data', async () => {
    // Matches message 'Database'
    const resMsg = await request(server)
      .get('/api/logs?search=Database')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(resMsg.body.items.length).toBe(1)
    expect(resMsg.body.items[0].id).toBe('2')

    // Matches data '{ query: ... }'
    const resData = await request(server)
      .get('/api/logs?search=SELECT')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(resData.body.items.length).toBe(1)
    expect(resData.body.items[0].id).toBe('4')
  })

  it('level + search combined works', async () => {
    // Search 'admin' but restrict to level 'info'
    const res = await request(server)
      .get('/api/logs?level=info&search=admin')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(1)
    expect(res.body.items[0].id).toBe('5')

    // Search 'admin' with level 'error' -> should be empty
    const resEmpty = await request(server)
      .get('/api/logs?level=error&search=admin')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(resEmpty.body.items.length).toBe(0)
  })

  it('empty or whitespace search ignores search filter', async () => {
    const res = await request(server)
      .get('/api/logs?search=%20%20')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(6)
  })

  it('special characters in search are handled safely without SQL injection', async () => {
    const searchTerm = encodeURIComponent('chars % _ \' "')
    const res = await request(server)
      .get(`/api/logs?search=${searchTerm}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(1)
    expect(res.body.items[0].id).toBe('6')
  })

  it('pagination with search works', async () => {
    const res = await request(server)
      .get('/api/logs?search=e&page=1&perPage=2')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    // 'e' appears in a lot of them. 
    // id: 1 (System started), 2 (Database connection failed), 3 (High memory usage), 4 (executed, SELECT), 5 (User logged in), 6 (Special chars message)
    // Actually 'e' is in all 6 messages. 
    expect(res.body.items.length).toBe(2)
    expect(res.body.totalItems).toBe(6)
  })
})
