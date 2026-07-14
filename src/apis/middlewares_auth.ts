import { Request, Response, NextFunction } from 'express'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { findAuthRecordByToken } from '../core/record_query'

export interface AuthContext {
  record: PBRecord | null
  isAdmin: boolean
  token: string | null
}

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext
    }
  }
}

export function loadAuthToken(app: BaseApp) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      req.authContext = { record: null, isAdmin: false, token: null }
      return next()
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    const payload = app.parseJWT(token, app.getJwtSecret())

    if (!payload) {
      req.authContext = { record: null, isAdmin: false, token: null }
      return next()
    }

    if (payload.isAdmin) {
      req.authContext = { record: null, isAdmin: true, token }
      return next()
    }
    if (payload.type === 'auth') {
      try {
        const record = await findAuthRecordByToken(app, token)

        if (record) {
          req.authContext = {
            record,
            isAdmin: false,
            token,
          }

          return next()
        }
      } catch {
        req.authContext = { record: null, isAdmin: false, token: null }
        return next()
      }
    }

    if (payload.type === 'admin' && payload.id) {
      try {
        const db = app.db().getDataDB()
        const row = db.prepare(`SELECT id FROM _superusers WHERE id = ?`).get(payload.id)
        if (row) {
          req.authContext = { record: null, isAdmin: true, token }
          return next()
        }
      } catch {
        // _superusers table may not exist yet
      }
    }

    req.authContext = { record: null, isAdmin: false, token }
    next()
  }
}

export function requireAuth(app: BaseApp) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.authContext?.record && !req.authContext?.isAdmin) {
      return res.status(401).json({ code: 401, message: 'Authentication required.' })
    }
    next()
  }
}

export function requireSuperuserAuth(app: BaseApp) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.authContext?.isAdmin) {
      return res.status(403).json({ code: 403, message: 'Superuser authentication required.' })
    }
    next()
  }
}

export function requireSameCollectionContextAuth(collectionIdOrName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.authContext
    if (ctx?.record && ctx.record.collectionName !== collectionIdOrName && ctx.record.collectionId !== collectionIdOrName) {
      return res.status(403).json({ code: 403, message: 'Invalid collection context.' })
    }
    next()
  }
}

export function requireGuestOnly() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.authContext?.record || req.authContext?.isAdmin) {
      return res.status(400).json({ code: 400, message: 'Only guests can access this endpoint.' })
    }
    next()
  }
}
