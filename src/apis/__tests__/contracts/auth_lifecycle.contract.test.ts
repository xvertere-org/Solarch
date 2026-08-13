import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { Collection } from '../../../core/collection'
import { RecordModel as PBRecord } from '../../../core/record'
import { hashPassword, verifyPassword } from '../../../tools/security/crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Auth & Token Lifecycle Contract (CORE-6)', () => {
  let app: Solarch
  let tempDir: string
  let usersCollection: Collection

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-auth-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    usersCollection = new Collection({
      name: 'users_auth_test',
      type: 'auth',
      listRule: '',
      viewRule: '',
      fields: [{ name: 'name', type: 'text' }],
    })
    await app.save(usersCollection)
  })

  afterAll(async () => {
    if (app) await app.db().close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('generates and parses valid user auth JWT tokens', () => {
    const payload = { id: 'rec_user123', type: 'auth', collectionId: usersCollection.id }
    const token = app.generateJWT(payload, app.getJwtSecret(), '720h')

    expect(typeof token).toBe('string')
    const parsed = app.parseJWT(token, app.getJwtSecret())

    expect(parsed?.id).toBe('rec_user123')
    expect(parsed?.type).toBe('auth')
    expect(parsed?.collectionId).toBe(usersCollection.id)
  })

  it('generates and parses admin JWT tokens', () => {
    const payload = { id: 'su_admin123', type: 'admin' }
    const token = app.generateJWT(payload, app.getJwtSecret(), '720h')

    const parsed = app.parseJWT(token, app.getJwtSecret())
    expect(parsed?.id).toBe('su_admin123')
    expect(parsed?.type).toBe('admin')
  })

  it('correctly manages token revocation and rotation grace window', async () => {
    const token = 'sample_token_to_revoke_xyz'
    expect(await app.isTokenRevoked(token, 'user_refresh')).toBe(false)

    // Revoke token
    await app.revokeToken(token, 'user_refresh', 'rec_user123', 60)

    // Token is now revoked
    expect(await app.isTokenRevoked(token, 'user_refresh')).toBe(true)
  })

  it('validates passwords securely with Argon2id hashing', async () => {
    const rawPassword = 'StrongPassword123!'
    const hash = await hashPassword(rawPassword)

    expect(typeof hash).toBe('string')
    expect(hash).not.toBe(rawPassword)

    const isValid = await verifyPassword(rawPassword, hash)
    expect(isValid).toBe(true)

    const isInvalid = await verifyPassword('WrongPassword', hash)
    expect(isInvalid).toBe(false)
  })
})
