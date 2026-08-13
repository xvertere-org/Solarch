import { BaseApp } from './base'
import { RecordModel as PBRecord } from './record'
import { MFA, OTP, AuthOrigin, ExternalAuth } from './auth_models'
import { validateIdentifier } from '../utils/sql_safe'

export async function findAllMFAsByRecord(app: BaseApp, record: PBRecord): Promise<MFA[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _mfas WHERE recordRef = ? AND collectionId = ? ORDER BY created DESC`,
    [record.id, record.collectionId]
  )

  return rows.map(row => new MFA(row))
}

export async function findAllMFAsByCollection(app: BaseApp, collectionId: string): Promise<MFA[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _mfas WHERE collectionId = ? ORDER BY created DESC`,
    [collectionId]
  )

  return rows.map(row => new MFA(row))
}

export async function findMFAById(app: BaseApp, id: string): Promise<MFA | null> {
  const row = await app.db().queryOne<any>(`SELECT * FROM _mfas WHERE id = ?`, [id])
  if (!row) return null
  return new MFA(row)
}

export async function deleteAllMFAsByRecord(app: BaseApp, record: PBRecord): Promise<void> {
  await app.db().execute(`DELETE FROM _mfas WHERE recordRef = ? AND collectionId = ?`, [record.id, record.collectionId])
}

export async function deleteExpiredMFAs(app: BaseApp): Promise<number> {
  const now = new Date().toISOString()
  const result = await app.db().execute(`DELETE FROM _mfas WHERE expiresAt < ?`, [now])
  return result.rowsAffected
}

export async function findAllOTPsByRecord(app: BaseApp, record: PBRecord): Promise<OTP[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _otps WHERE recordRef = ? AND collectionId = ? ORDER BY created DESC`,
    [record.id, record.collectionId]
  )

  return rows.map(row => new OTP(row))
}

export async function findAllOTPsByCollection(app: BaseApp, collectionId: string): Promise<OTP[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _otps WHERE collectionId = ? ORDER BY created DESC`,
    [collectionId]
  )

  return rows.map(row => new OTP(row))
}

export async function findOTPById(app: BaseApp, id: string): Promise<OTP | null> {
  const row = await app.db().queryOne<any>(`SELECT * FROM _otps WHERE id = ?`, [id])
  if (!row) return null
  return new OTP(row)
}

export async function deleteAllOTPsByRecord(app: BaseApp, record: PBRecord): Promise<void> {
  await app.db().execute(`DELETE FROM _otps WHERE recordRef = ? AND collectionId = ?`, [record.id, record.collectionId])
}

export async function deleteExpiredOTPs(app: BaseApp): Promise<number> {
  const now = new Date().toISOString()
  const result = await app.db().execute(`DELETE FROM _otps WHERE expiresAt < ?`, [now])
  return result.rowsAffected
}

export async function findAllAuthOriginsByRecord(app: BaseApp, record: PBRecord): Promise<AuthOrigin[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _authOrigins WHERE recordRef = ? AND collectionId = ? ORDER BY created DESC`,
    [record.id, record.collectionId]
  )

  return rows.map(row => new AuthOrigin(row))
}

export async function findAllAuthOriginsByCollection(app: BaseApp, collectionId: string): Promise<AuthOrigin[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _authOrigins WHERE collectionId = ? ORDER BY created DESC`,
    [collectionId]
  )

  return rows.map(row => new AuthOrigin(row))
}

export async function findAuthOriginById(app: BaseApp, id: string): Promise<AuthOrigin | null> {
  const row = await app.db().queryOne<any>(`SELECT * FROM _authOrigins WHERE id = ?`, [id])
  if (!row) return null
  return new AuthOrigin(row)
}

export async function findAuthOriginByRecordAndFingerprint(
  app: BaseApp,
  record: PBRecord,
  fingerprint: string
): Promise<AuthOrigin | null> {
  const row = await app.db().queryOne<any>(
    `SELECT * FROM _authOrigins WHERE recordRef = ? AND collectionId = ? AND fingerprint = ?`,
    [record.id, record.collectionId, fingerprint]
  )
  if (!row) return null
  return new AuthOrigin(row)
}

export async function deleteAllAuthOriginsByRecord(app: BaseApp, record: PBRecord): Promise<void> {
  await app.db().execute(`DELETE FROM _authOrigins WHERE recordRef = ? AND collectionId = ?`, [record.id, record.collectionId])
}

export async function findAllExternalAuthsByRecord(app: BaseApp, record: PBRecord): Promise<ExternalAuth[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _externalAuths WHERE recordRef = ? AND collectionId = ?`,
    [record.id, record.collectionId]
  )

  return rows.map(row => new ExternalAuth(row))
}

export async function findAllExternalAuthsByCollection(app: BaseApp, collectionId: string): Promise<ExternalAuth[]> {
  const rows = await app.db().query<any>(
    `SELECT * FROM _externalAuths WHERE collectionId = ?`,
    [collectionId]
  )

  return rows.map(row => new ExternalAuth(row))
}

const EXTERNAL_AUTH_FIELDS = new Set(['id', 'recordRef', 'collectionId', 'provider', 'providerId', 'created', 'updated', 'providerId'])

export async function findFirstExternalAuthByExpr(
  app: BaseApp,
  expression: { field: string; value: any }
): Promise<ExternalAuth | null> {
  if (!EXTERNAL_AUTH_FIELDS.has(expression.field)) {
    throw new Error(`Invalid field name for external auth query: "${expression.field}"`)
  }
  const row = await app.db().queryOne<any>(
    `SELECT * FROM _externalAuths WHERE ${expression.field} = ? ORDER BY created DESC LIMIT 1`,
    [expression.value]
  )
  if (!row) return null
  return new ExternalAuth(row)
}
